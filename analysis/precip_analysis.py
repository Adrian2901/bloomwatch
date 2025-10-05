import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
from sentinelhub import (
    SHConfig,
    SentinelHubCatalog,  # ADDED - was missing
    SentinelHubRequest,
    DataCollection,
    MimeType,
    BBox,
    CRS,
    bbox_to_dimensions
)
import os
from datetime import datetime, timedelta
import requests

# -------------------- CONFIG --------------------
config = SHConfig()
config.sh_client_id = ""
config.sh_client_secret = ""
config.save()

# -------------------- AREA OF INTEREST --------------------
bbox_coords = [-118.3, 34.4, -117.9, 34.7]  # Antelope Valley (Palmdale/Lancaster)
aoi_bbox = BBox(bbox=bbox_coords, crs=CRS.WGS84)
size = bbox_to_dimensions(aoi_bbox, resolution=30)

# Center point for Daymet (single pixel)
center_lat = (34.4 + 34.7) / 2
center_lon = (-118.3 + -117.9) / 2

# -------------------- TIME RANGE --------------------
start_date = '2015-01-01'
end_date = '2023-12-31'

# -------------------- FETCH ACQUISITION DATES --------------------
print("Querying Sentinel-2 acquisition dates...")
catalog = SentinelHubCatalog(config=config)
search_iterator = catalog.search(
    DataCollection.SENTINEL2_L2A,
    bbox=aoi_bbox,
    time=(start_date, end_date),
    filter="eo:cloud_cover < 30",  # Filter for low cloud cover
    fields={"include": ["id", "properties.datetime"], "exclude": []}
)

# Collect all dates
all_dates = []
for item in search_iterator:
    all_dates.append(item['properties']['datetime'])

dates = pd.to_datetime(all_dates)
dates = dates.sort_values()
print(f"Found {len(dates)} Sentinel-2 scenes with <30% cloud cover.")

# -------------------- BATCH FETCH NDVI --------------------
print("\nFetching NDVI data from Sentinel Hub (this may take a while)...")

# Create monthly time slots for efficient batch processing
date_range = pd.date_range(start_date, end_date, freq='MS')
ndvi_monthly_data = []
ndvi_monthly_dates = []

evalscript = """
//VERSION=3
function setup() {
    return {
        input: [{
            bands: ["B04", "B08", "SCL"],
            units: "DN"
        }],
        output: {
            bands: 1,
            sampleType: "FLOAT32"
        }
    };
}

function evaluatePixel(sample) {
    // SCL values: 4=vegetation, 5=not-vegetated, 6=water, etc.
    // Filter out clouds (8,9), cloud shadows (3), and no data (0)
    if (sample.SCL == 3 || sample.SCL == 8 || sample.SCL == 9 || sample.SCL == 0) {
        return [NaN];
    }
    
    let ndvi = (sample.B08 - sample.B04) / (sample.B08 + sample.B04 + 0.0001);
    return [ndvi];
}
"""

# Fetch NDVI for each month
for i in range(len(date_range) - 1):
    time_start = date_range[i].strftime('%Y-%m-%d')
    time_end = (date_range[i + 1] - timedelta(days=1)).strftime('%Y-%m-%d')
    
    try:
        request = SentinelHubRequest(
            evalscript=evalscript,
            input_data=[
                SentinelHubRequest.input_data(
                    data_collection=DataCollection.SENTINEL2_L2A,
                    time_interval=(time_start, time_end),
                    mosaicking_order='leastCC'  # Pick least cloudy
                )
            ],
            responses=[SentinelHubRequest.output_response('default', MimeType.TIFF)],
            bbox=aoi_bbox,
            size=size,
            config=config
        )
        
        data = request.get_data()
        
        if data and len(data) > 0:
            ndvi_mean = np.nanmean(data[0])
            if not np.isnan(ndvi_mean):
                ndvi_monthly_data.append(ndvi_mean)
                ndvi_monthly_dates.append(date_range[i])
                print(f"  {time_start}: NDVI = {ndvi_mean:.3f}")
            else:
                print(f"  {time_start}: No valid data (all NaN)")
        else:
            print(f"  {time_start}: No data returned")
            
    except Exception as e:
        print(f"  {time_start}: Error - {e}")
        continue

# Create NDVI time series
ndvi_series = pd.Series(ndvi_monthly_data, index=ndvi_monthly_dates, name='NDVI')
print(f"\nSuccessfully retrieved {len(ndvi_series)} monthly NDVI values.")

# -------------------- FETCH DAYMET PRECIPITATION --------------------
print("\nFetching Daymet precipitation data...")
print(f"Location: Lat={center_lat:.4f}, Lon={center_lon:.4f}")

# Daymet API endpoint (v4 - updated)
daymet_url = "https://daymet.ornl.gov/single-pixel/api/data"

precip_data = []
years = range(2015, 2024)

for year in years:
    params = {
        'lat': center_lat,
        'lon': center_lon,
        'vars': 'prcp',
        'start': f'{year}-01-01',
        'end': f'{year}-12-31'
    }
    
    try:
        print(f"  {year}: Requesting data...", end=' ')
        response = requests.get(daymet_url, params=params, timeout=60)
        
        # Check response status
        if response.status_code != 200:
            print(f"Failed (HTTP {response.status_code})")
            print(f"    Response: {response.text[:200]}")
            continue
        
        # Parse CSV format (Daymet default)
        lines = response.text.strip().split('\n')
        
        # Skip header lines (usually 7 lines starting with year, yday, prcp)
        data_start = 0
        for i, line in enumerate(lines):
            if not line.startswith('year') and not line.startswith('#'):
                data_start = i
                break
        
        # Parse data lines
        count = 0
        for line in lines[data_start:]:
            if line.strip() and not line.startswith('#'):
                parts = line.split(',')
                if len(parts) >= 3:
                    try:
                        yr = int(parts[0])
                        doy = int(parts[1])
                        prcp = float(parts[2])
                        
                        date = pd.to_datetime(f"{yr}-{doy}", format='%Y-%j')
                        precip_data.append({'date': date, 'prcp_mm': prcp})
                        count += 1
                    except (ValueError, IndexError):
                        continue
        
        print(f"✓ Retrieved {count} days")
        
    except requests.exceptions.Timeout:
        print(f"Timeout (>60s)")
    except requests.exceptions.RequestException as e:
        print(f"Network error - {e}")
    except Exception as e:
        print(f"Error - {e}")
        continue

print(f"\nTotal precipitation records collected: {len(precip_data)}")

# Create precipitation DataFrame only if we have data
if len(precip_data) == 0:
    print("\n⚠️  WARNING: No Daymet data retrieved. Possible causes:")
    print("   - Network connection issues")
    print("   - Daymet API temporarily unavailable")
    print("   - Location outside Daymet coverage (North America only)")
    print("\n   Continuing with NDVI analysis only...\n")
    precip_df = pd.DataFrame()
    winter_precip_annual = pd.Series(dtype=float)
else:
    precip_df = pd.DataFrame(precip_data)
    precip_df.set_index('date', inplace=True)
    precip_df = precip_df.sort_index()
    
    # Calculate cumulative winter precipitation (Oct-Mar)
    precip_df['water_year'] = precip_df.index.year
    precip_df.loc[precip_df.index.month >= 10, 'water_year'] += 1
    
    winter_precip = precip_df[(precip_df.index.month >= 10) | (precip_df.index.month <= 3)]
    winter_precip_annual = winter_precip.groupby('water_year')['prcp_mm'].sum()
    winter_precip_annual.name = 'Winter_Precip_mm'
    
    print(f"✓ Calculated winter precipitation for {len(winter_precip_annual)} water years.")

# -------------------- AGGREGATE NDVI --------------------
# Annual NDVI
ndvi_annual = ndvi_series.resample('YE').mean()

# Seasonal NDVI (DJF, MAM, JJA, SON)
seasons = {'Winter(DJF)': [12, 1, 2], 'Spring(MAM)': [3, 4, 5], 
           'Summer(JJA)': [6, 7, 8], 'Fall(SON)': [9, 10, 11]}
ndvi_seasonal = pd.DataFrame()

for name, months in seasons.items():
    seasonal_data = ndvi_series[ndvi_series.index.month.isin(months)]
    ndvi_seasonal[name] = seasonal_data.groupby(seasonal_data.index.year).mean()

# -------------------- COMBINE NDVI + PRECIPITATION --------------------
# Only combine if we have precipitation data
if len(winter_precip_annual) > 0:
    # Merge on water year
    combined_df = pd.DataFrame({
        'Spring_NDVI': ndvi_seasonal['Spring(MAM)'],
        'Annual_NDVI': ndvi_annual.groupby(ndvi_annual.index.year).mean()
    })
    
    combined_df = combined_df.join(winter_precip_annual, how='inner')
    combined_df = combined_df.dropna()
    
    print(f"\nCombined dataset: {len(combined_df)} years with both NDVI and precipitation data")
    
    # Calculate correlation
    if len(combined_df) > 0:
        corr_spring = combined_df['Spring_NDVI'].corr(combined_df['Winter_Precip_mm'])
        print(f"Correlation (Winter Precip vs Spring NDVI): {corr_spring:.3f}")
else:
    combined_df = pd.DataFrame()
    print("\nSkipping combined analysis (no precipitation data available)")

# -------------------- IDENTIFY SUPERBLOOM YEARS --------------------
# Superbloom = high spring NDVI + high winter precip
if len(combined_df) > 0:
    # Normalize both metrics
    combined_df['NDVI_zscore'] = (combined_df['Spring_NDVI'] - combined_df['Spring_NDVI'].mean()) / combined_df['Spring_NDVI'].std()
    combined_df['Precip_zscore'] = (combined_df['Winter_Precip_mm'] - combined_df['Winter_Precip_mm'].mean()) / combined_df['Winter_Precip_mm'].std()
    
    # Superbloom score
    combined_df['Superbloom_Score'] = combined_df['NDVI_zscore'] + combined_df['Precip_zscore']
    
    top_year = combined_df['Superbloom_Score'].idxmax()
    print(f"\nMost likely superbloom year: {top_year}")
    print(f"  Spring NDVI: {combined_df.loc[top_year, 'Spring_NDVI']:.3f}")
    print(f"  Winter Precip: {combined_df.loc[top_year, 'Winter_Precip_mm']:.1f} mm")

# -------------------- PLOTS --------------------
save_folder = "ndvi_results"
os.makedirs(save_folder, exist_ok=True)

# 1. Annual NDVI plot
fig, ax = plt.subplots(figsize=(12, 5))
ax.plot(ndvi_annual.index.year, ndvi_annual.values, marker='o', linewidth=2, markersize=8)
ax.set_title("Antelope Valley Annual Mean NDVI (2015-2023)", fontsize=14, fontweight='bold')
ax.set_xlabel("Year", fontsize=12)
ax.set_ylabel("NDVI", fontsize=12)
ax.grid(True, alpha=0.3)
plt.tight_layout()
plt.savefig(os.path.join(save_folder, "annual_ndvi.png"), dpi=300)
plt.show()

# 2. Seasonal NDVI plot
fig, ax = plt.subplots(figsize=(14, 6))
ndvi_seasonal.plot(kind='bar', ax=ax, width=0.8)
ax.set_title("Antelope Valley Seasonal NDVI (2015-2023)", fontsize=14, fontweight='bold')
ax.set_xlabel("Year", fontsize=12)
ax.set_ylabel("NDVI", fontsize=12)
ax.legend(title="Season", fontsize=10)
ax.grid(True, alpha=0.3, axis='y')
plt.xticks(rotation=45)
plt.tight_layout()
plt.savefig(os.path.join(save_folder, "seasonal_ndvi.png"), dpi=300)
plt.show()

# 3. Spring NDVI + Winter Precipitation
if len(combined_df) > 0:
    fig, ax1 = plt.subplots(figsize=(14, 6))
    
    ax1.set_xlabel('Water Year', fontsize=12)
    ax1.set_ylabel('Spring NDVI', color='green', fontsize=12)
    line1 = ax1.plot(combined_df.index, combined_df['Spring_NDVI'], 
                     color='green', marker='o', linewidth=2, markersize=8, label='Spring NDVI')
    ax1.tick_params(axis='y', labelcolor='green')
    ax1.grid(True, alpha=0.3)
    
    ax2 = ax1.twinx()
    ax2.set_ylabel('Winter Precipitation (mm)', color='blue', fontsize=12)
    line2 = ax2.bar(combined_df.index, combined_df['Winter_Precip_mm'], 
                    alpha=0.5, color='blue', label='Winter Precip')
    ax2.tick_params(axis='y', labelcolor='blue')
    
    # Highlight top year
    if 'Superbloom_Score' in combined_df.columns:
        ax1.axvline(x=top_year, color='red', linestyle='--', linewidth=2, alpha=0.7)
        ax1.text(top_year, ax1.get_ylim()[1] * 0.95, f'Peak: {top_year}', 
                ha='center', fontsize=10, color='red', fontweight='bold')
    
    plt.title('Spring NDVI vs Winter Precipitation (Superbloom Analysis)', 
              fontsize=14, fontweight='bold', pad=20)
    
    # Combine legends
    lines = line1 + [line2]
    labels = [l.get_label() for l in lines]
    ax1.legend(lines, labels, loc='upper left', fontsize=10)
    
    plt.tight_layout()
    plt.savefig(os.path.join(save_folder, "ndvi_precip_correlation.png"), dpi=300)
    plt.show()

# 4. Superbloom Score Ranking
if len(combined_df) > 0 and 'Superbloom_Score' in combined_df.columns:
    fig, ax = plt.subplots(figsize=(12, 6))
    colors = ['red' if x == combined_df['Superbloom_Score'].max() else 'steelblue' 
              for x in combined_df['Superbloom_Score']]
    ax.bar(combined_df.index, combined_df['Superbloom_Score'], color=colors)
    ax.set_title('Superbloom Likelihood Score (NDVI + Precipitation)', 
                 fontsize=14, fontweight='bold')
    ax.set_xlabel('Water Year', fontsize=12)
    ax.set_ylabel('Combined Z-Score', fontsize=12)
    ax.axhline(y=0, color='black', linestyle='-', linewidth=0.5)
    ax.grid(True, alpha=0.3, axis='y')
    plt.tight_layout()
    plt.savefig(os.path.join(save_folder, "superbloom_score.png"), dpi=300)
    plt.show()

# -------------------- SAVE DATA --------------------
ndvi_annual.to_csv(os.path.join(save_folder, "annual_ndvi.csv"))
ndvi_seasonal.to_csv(os.path.join(save_folder, "seasonal_ndvi.csv"))
ndvi_series.to_csv(os.path.join(save_folder, "monthly_ndvi.csv"))

if len(precip_df) > 0:
    precip_df.to_csv(os.path.join(save_folder, "daily_precipitation.csv"))
    winter_precip_annual.to_csv(os.path.join(save_folder, "winter_precipitation.csv"))

if len(combined_df) > 0:
    combined_df.to_csv(os.path.join(save_folder, "combined_ndvi_precipitation.csv"))

print(f"\n✓ Analysis complete! Results saved to '{save_folder}' folder")
print(f"  - {len(ndvi_series)} monthly NDVI values")
print(f"  - {len(precip_df)} daily precipitation values")
print(f"  - {len(combined_df)} years of combined analysis")
print(f"  - 4 visualization plots")
print(f"  - 6 CSV files")