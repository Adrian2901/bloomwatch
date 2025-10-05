"""
Integrated Sentinel-2 NDVI + Precipitation Analysis
Clean version with automatic fallback to Daymet
"""

import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
from matplotlib.gridspec import GridSpec
from sentinelhub import (
    SHConfig,
    SentinelHubCatalog,
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
from pathlib import Path
import warnings
warnings.filterwarnings('ignore')

# ==================== CONFIGURATION ====================
print("=" * 80)
print(" INTEGRATED NDVI + PRECIPITATION ANALYSIS")
print("=" * 80)

# Sentinel Hub credentials
config = SHConfig()
config.sh_client_id = ""
config.sh_client_secret = ""
config.save()

# Area of interest
bbox_coords = [-116.95, 36.45, -116.75, 36.35]  # Death Valley
aoi_bbox = BBox(bbox=bbox_coords, crs=CRS.WGS84)
size = bbox_to_dimensions(aoi_bbox, resolution=30)

bbox = {
    'west': bbox_coords[0],
    'south': bbox_coords[1],
    'east': bbox_coords[2],
    'north': bbox_coords[3]
}

# Time range
start_date = '2015-01-01'
end_date = '2024-07-31'

# Output folders
output_folder = Path('integrated_results')
output_folder.mkdir(exist_ok=True)

print(f"\nStudy Area: Antelope Valley, CA")
print(f"Time Period: {start_date} to {end_date}\n")

# ==================== PART 1: PRECIPITATION DATA ====================
print("=" * 80)
print(" STEP 1: Downloading Precipitation Data (Using Daymet)")
print("=" * 80)

center_lat = (bbox['south'] + bbox['north']) / 2
center_lon = (bbox['west'] + bbox['east']) / 2

print(f"\nLocation: Lat={center_lat:.4f}, Lon={center_lon:.4f}")
print("Using Daymet (ORNL) for reliable precipitation data...\n")

daymet_url = "https://daymet.ornl.gov/single-pixel/api/data"
years = range(2015, 2025)

daily_precip = []
for year in years:
    params = {
        'lat': center_lat,
        'lon': center_lon,
        'vars': 'prcp',
        'start': f'{year}-01-01',
        'end': f'{year}-12-31'
    }
    
    try:
        print(f"  {year}: Requesting...", end=' ')
        response = requests.get(daymet_url, params=params, timeout=60)
        
        if response.status_code == 200:
            lines = response.text.strip().split('\n')
            data_start = 0
            for i, line in enumerate(lines):
                if not line.startswith('year') and not line.startswith('#'):
                    data_start = i
                    break
            
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
                            daily_precip.append({'date': date, 'prcp_mm': prcp})
                            count += 1
                        except (ValueError, IndexError):
                            continue
            
            print(f"✓ {count} days")
        else:
            print(f"✗ HTTP {response.status_code}")
            
    except Exception as e:
        print(f"✗ {e}")

if not daily_precip:
    print("\n✗ ERROR: Could not download precipitation data!")
    print("Continuing with NDVI-only analysis...")
    precip_df = pd.DataFrame()
    winter_precip_annual = pd.Series(dtype=float)
else:
    # Convert to monthly
    daily_df = pd.DataFrame(daily_precip)
    daily_df.set_index('date', inplace=True)
    precip_df = daily_df.resample('MS').sum()
    precip_df.columns = ['mean_precip_mm']
    
    print(f"\n✓ Downloaded {len(precip_df)} months of precipitation data")
    
    # Calculate winter precipitation (Oct-Mar)
    precip_df['water_year'] = precip_df.index.year
    precip_df.loc[precip_df.index.month >= 10, 'water_year'] += 1
    
    winter_months = (precip_df.index.month >= 10) | (precip_df.index.month <= 3)
    winter_precip_annual = precip_df[winter_months].groupby('water_year')['mean_precip_mm'].sum()
    winter_precip_annual.name = 'Winter_Precip_mm'
    
    print(f"✓ Calculated winter precipitation for {len(winter_precip_annual)} water years")

# ==================== PART 2: NDVI DATA ====================
print("\n" + "=" * 80)
print(" STEP 2: Downloading Sentinel-2 NDVI Data")
print("=" * 80)

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
    // Filter clouds
    if (sample.SCL == 3 || sample.SCL == 8 || sample.SCL == 9 || sample.SCL == 0) {
        return [NaN];
    }
    
    let ndvi = (sample.B08 - sample.B04) / (sample.B08 + sample.B04 + 0.0001);
    return [ndvi];
}
"""

ndvi_data_list = []
date_range = pd.date_range(start_date, end_date, freq='MS')

print(f"\nProcessing {len(date_range)} months...\n")

for i, date in enumerate(date_range, 1):
    time_start = date.strftime('%Y-%m-%d')
    time_end = (date + pd.DateOffset(months=1) - timedelta(days=1)).strftime('%Y-%m-%d')
    
    try:
        print(f"  [{i}/{len(date_range)}] {time_start}: ", end='')
        
        request = SentinelHubRequest(
            evalscript=evalscript,
            input_data=[
                SentinelHubRequest.input_data(
                    data_collection=DataCollection.SENTINEL2_L2A,
                    time_interval=(time_start, time_end),
                    mosaicking_order='leastCC'
                )
            ],
            responses=[SentinelHubRequest.output_response('default', MimeType.TIFF)],
            bbox=aoi_bbox,
            size=size,
            config=config
        )
        
        data = request.get_data()
        
        if data and len(data) > 0:
            ndvi_array = data[0]
            mean_ndvi = np.nanmean(ndvi_array)
            
            if not np.isnan(mean_ndvi):
                ndvi_data_list.append({
                    'date': date,
                    'data': ndvi_array,
                    'mean_ndvi': mean_ndvi
                })
                print(f"✓ NDVI = {mean_ndvi:.3f}")
            else:
                print("✗ No valid data")
        else:
            print("✗ No data returned")
            
    except Exception as e:
        print(f"✗ Error: {e}")
        continue

print(f"\n✓ Downloaded {len(ndvi_data_list)} months of NDVI data")

# Create NDVI time series
ndvi_df = pd.DataFrame([
    {'date': item['date'], 'ndvi': item['mean_ndvi']} 
    for item in ndvi_data_list
])
ndvi_df.set_index('date', inplace=True)

# Calculate seasonal NDVI
seasons = {
    'Winter(DJF)': [12, 1, 2], 
    'Spring(MAM)': [3, 4, 5], 
    'Summer(JJA)': [6, 7, 8], 
    'Fall(SON)': [9, 10, 11]
}

ndvi_seasonal = pd.DataFrame()
for name, months in seasons.items():
    seasonal_data = ndvi_df[ndvi_df.index.month.isin(months)]
    ndvi_seasonal[name] = seasonal_data.groupby(seasonal_data.index.year).mean()

# ==================== PART 3: COMBINED ANALYSIS ====================
print("\n" + "=" * 80)
print(" STEP 3: Combined Analysis & Superbloom Detection")
print("=" * 80)

if len(winter_precip_annual) > 0 and len(ndvi_seasonal) > 0:
    # Combine datasets
    combined_df = pd.DataFrame({
        'Spring_NDVI': ndvi_seasonal['Spring(MAM)'],
        'Annual_NDVI': ndvi_df.groupby(ndvi_df.index.year).mean()['ndvi']
    })
    
    combined_df = combined_df.join(winter_precip_annual, how='inner')
    combined_df = combined_df.dropna()
    
    if len(combined_df) > 0:
        # Normalize and calculate superbloom score
        combined_df['NDVI_zscore'] = (combined_df['Spring_NDVI'] - combined_df['Spring_NDVI'].mean()) / combined_df['Spring_NDVI'].std()
        combined_df['Precip_zscore'] = (combined_df['Winter_Precip_mm'] - combined_df['Winter_Precip_mm'].mean()) / combined_df['Winter_Precip_mm'].std()
        combined_df['Superbloom_Score'] = combined_df['NDVI_zscore'] + combined_df['Precip_zscore']
        
        top_year = combined_df['Superbloom_Score'].idxmax()
        correlation = combined_df['Spring_NDVI'].corr(combined_df['Winter_Precip_mm'])
        
        print(f"\n🌸 SUPERBLOOM ANALYSIS RESULTS:")
        print(f"  Peak Year: {top_year}")
        print(f"  Spring NDVI: {combined_df.loc[top_year, 'Spring_NDVI']:.3f}")
        print(f"  Winter Precip: {combined_df.loc[top_year, 'Winter_Precip_mm']:.1f} mm")
        print(f"  Correlation (NDVI vs Precip): {correlation:.3f}")
    else:
        combined_df = pd.DataFrame()
        top_year = None
else:
    combined_df = pd.DataFrame()
    top_year = None
    print("\nInsufficient data for combined analysis")

# ==================== PART 4: VISUALIZATIONS ====================
print("\n" + "=" * 80)
print(" STEP 4: Creating Visualizations")
print("=" * 80)

# Create folder for satellite images
maps_folder = output_folder / 'satellite_maps'
maps_folder.mkdir(exist_ok=True)

# 1. Export NDVI satellite images for key months
print("\nExporting NDVI satellite images...")

if len(ndvi_data_list) > 0:
    # Find spring months (March-May) for each year
    spring_images = [item for item in ndvi_data_list if item['date'].month in [3, 4, 5]]
    
    print(f"  Found {len(spring_images)} spring months with data")
    
    # Export a selection of images
    for item in spring_images[:10]:  # Limit to first 10 for speed
        date_str = item['date'].strftime('%Y_%m')
        ndvi_map = item['data']
        
        # Create NDVI visualization
        fig, ax = plt.subplots(figsize=(10, 8))
        
        # Use a nice colormap for NDVI (brown to green)
        im = ax.imshow(ndvi_map, cmap='RdYlGn', vmin=0, vmax=0.7, interpolation='bilinear')
        ax.set_title(f'NDVI - {item["date"].strftime("%B %Y")}\nAntelope Valley, CA', 
                     fontsize=14, fontweight='bold')
        ax.axis('off')
        
        # Add colorbar
        cbar = plt.colorbar(im, ax=ax, fraction=0.046, pad=0.04)
        cbar.set_label('NDVI (Vegetation Index)', fontsize=11)
        
        # Add statistics text box
        stats_text = f"Mean: {item['mean_ndvi']:.3f}\nMin: {np.nanmin(ndvi_map):.3f}\nMax: {np.nanmax(ndvi_map):.3f}"
        ax.text(0.02, 0.98, stats_text, transform=ax.transAxes,
                fontsize=10, verticalalignment='top',
                bbox=dict(boxstyle='round', facecolor='white', alpha=0.8))
        
        plt.tight_layout()
        save_path = maps_folder / f'ndvi_map_{date_str}.png'
        plt.savefig(save_path, dpi=300, bbox_inches='tight')
        plt.close()
        
        print(f"    ✓ Saved: ndvi_map_{date_str}.png")

# 2. Create comparison: Superbloom year vs Normal year
if len(combined_df) > 0 and top_year:
    print(f"\nCreating superbloom comparison (Peak year: {top_year})...")
    
    # Find spring image for peak year
    peak_spring = [item for item in ndvi_data_list 
                   if item['date'].year == top_year and item['date'].month in [3, 4]]
    
    # Find spring image for a low year
    low_year = combined_df['Superbloom_Score'].idxmin()
    low_spring = [item for item in ndvi_data_list 
                  if item['date'].year == low_year and item['date'].month in [3, 4]]
    
    if peak_spring and low_spring:
        fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(16, 7))
        
        # Peak year
        im1 = ax1.imshow(peak_spring[0]['data'], cmap='RdYlGn', vmin=0, vmax=0.7, interpolation='bilinear')
        ax1.set_title(f'SUPERBLOOM YEAR: {peak_spring[0]["date"].strftime("%B %Y")}\nNDVI = {peak_spring[0]["mean_ndvi"]:.3f}', 
                      fontsize=14, fontweight='bold', color='green')
        ax1.axis('off')
        plt.colorbar(im1, ax=ax1, fraction=0.046, pad=0.04, label='NDVI')
        
        # Low year
        im2 = ax2.imshow(low_spring[0]['data'], cmap='RdYlGn', vmin=0, vmax=0.7, interpolation='bilinear')
        ax2.set_title(f'NORMAL YEAR: {low_spring[0]["date"].strftime("%B %Y")}\nNDVI = {low_spring[0]["mean_ndvi"]:.3f}', 
                      fontsize=14, fontweight='bold')
        ax2.axis('off')
        plt.colorbar(im2, ax=ax2, fraction=0.046, pad=0.04, label='NDVI')
        
        plt.suptitle('Antelope Valley Spring Vegetation Comparison', 
                     fontsize=16, fontweight='bold', y=0.98)
        plt.tight_layout()
        plt.savefig(maps_folder / 'superbloom_comparison.png', dpi=300, bbox_inches='tight')
        print(f"  ✓ Saved: superbloom_comparison.png")
        plt.show()

# 3. Create animated time series (grid of multiple months)
if len(ndvi_data_list) >= 12:
    print("\nCreating multi-month NDVI grid...")
    
    # Select 12 evenly spaced images
    step = max(1, len(ndvi_data_list) // 12)
    selected_images = ndvi_data_list[::step][:12]
    
    fig, axes = plt.subplots(3, 4, figsize=(18, 14))
    axes = axes.flatten()
    
    for idx, item in enumerate(selected_images):
        if idx < 12:
            im = axes[idx].imshow(item['data'], cmap='RdYlGn', vmin=0, vmax=0.7, interpolation='bilinear')
            axes[idx].set_title(f'{item["date"].strftime("%b %Y")}\nNDVI={item["mean_ndvi"]:.2f}', 
                               fontsize=10, fontweight='bold')
            axes[idx].axis('off')
    
    # Add single colorbar
    fig.subplots_adjust(right=0.92)
    cbar_ax = fig.add_axes([0.94, 0.15, 0.02, 0.7])
    fig.colorbar(im, cax=cbar_ax, label='NDVI')
    
    plt.suptitle('NDVI Time Series - Antelope Valley', fontsize=16, fontweight='bold')
    plt.savefig(maps_folder / 'ndvi_time_series_grid.png', dpi=300, bbox_inches='tight')
    print(f"  ✓ Saved: ndvi_time_series_grid.png")
    plt.show()

# 4. Time series comparison plots
fig, axes = plt.subplots(3, 1, figsize=(16, 12))

# NDVI time series
axes[0].plot(ndvi_df.index, ndvi_df['ndvi'], marker='o', linewidth=2, markersize=5, color='green')
axes[0].set_ylabel('NDVI', fontsize=12, color='green')
axes[0].set_title('Monthly NDVI Time Series - Antelope Valley', fontsize=14, fontweight='bold')
axes[0].grid(True, alpha=0.3)
axes[0].tick_params(axis='y', labelcolor='green')

# Precipitation time series
if len(precip_df) > 0:
    axes[1].bar(precip_df.index, precip_df['mean_precip_mm'], width=20, color='blue', alpha=0.6)
    axes[1].set_ylabel('Precipitation (mm/month)', fontsize=12, color='blue')
    axes[1].set_title('Monthly Precipitation (Daymet)', fontsize=14, fontweight='bold')
    axes[1].grid(True, alpha=0.3, axis='y')
    axes[1].tick_params(axis='y', labelcolor='blue')

# Combined annual view
if len(combined_df) > 0:
    ax3_twin = axes[2].twinx()
    axes[2].plot(combined_df.index, combined_df['Spring_NDVI'], 
                 marker='o', linewidth=2, markersize=8, color='green', label='Spring NDVI')
    ax3_twin.bar(combined_df.index, combined_df['Winter_Precip_mm'], 
                 alpha=0.5, color='blue', label='Winter Precip')
    
    if top_year:
        axes[2].axvline(x=top_year, color='red', linestyle='--', linewidth=2, alpha=0.7)
        axes[2].text(top_year, axes[2].get_ylim()[1] * 0.95, f'Peak: {top_year}', 
                     ha='center', fontsize=11, color='red', fontweight='bold',
                     bbox=dict(boxstyle='round', facecolor='white', alpha=0.8))
    
    axes[2].set_xlabel('Year', fontsize=12)
    axes[2].set_ylabel('Spring NDVI', fontsize=12, color='green')
    ax3_twin.set_ylabel('Winter Precipitation (mm)', fontsize=12, color='blue')
    axes[2].set_title('Annual Superbloom Analysis', fontsize=14, fontweight='bold')
    axes[2].grid(True, alpha=0.3)
    axes[2].tick_params(axis='y', labelcolor='green')
    ax3_twin.tick_params(axis='y', labelcolor='blue')
    axes[2].legend(loc='upper left', fontsize=10)
    ax3_twin.legend(loc='upper right', fontsize=10)

plt.tight_layout()
plt.savefig(output_folder / 'time_series_combined.png', dpi=300, bbox_inches='tight')
print(f"\n  ✓ Saved: time_series_combined.png")
plt.show()

# 5. Superbloom ranking
if len(combined_df) > 0 and top_year:
    fig, ax = plt.subplots(figsize=(14, 6))
    colors = ['red' if idx == top_year else 'steelblue' for idx in combined_df.index]
    bars = ax.bar(combined_df.index, combined_df['Superbloom_Score'], color=colors)
    ax.set_title('Superbloom Likelihood Ranking', fontsize=16, fontweight='bold')
    ax.set_xlabel('Water Year', fontsize=13)
    ax.set_ylabel('Combined Score (NDVI + Precipitation)', fontsize=13)
    ax.axhline(y=0, color='black', linestyle='-', linewidth=0.8)
    ax.grid(True, alpha=0.3, axis='y')
    
    for bar in bars:
        height = bar.get_height()
        ax.text(bar.get_x() + bar.get_width()/2., height,
                f'{height:.2f}',
                ha='center', va='bottom' if height > 0 else 'top', fontsize=9)
    
    plt.tight_layout()
    plt.savefig(output_folder / 'superbloom_ranking.png', dpi=300, bbox_inches='tight')
    print(f"  ✓ Saved: superbloom_ranking.png")
    plt.show()

print(f"\n✓ All satellite maps saved to: {maps_folder.absolute()}")

# ==================== PART 5: SAVE DATA ====================
print("\n" + "=" * 80)
print(" STEP 5: Saving Results")
print("=" * 80)

ndvi_df.to_csv(output_folder / 'ndvi_monthly.csv')
ndvi_seasonal.to_csv(output_folder / 'ndvi_seasonal.csv')

if len(precip_df) > 0:
    precip_df.to_csv(output_folder / 'precipitation_monthly.csv')
    winter_precip_annual.to_csv(output_folder / 'winter_precipitation_annual.csv')

if len(combined_df) > 0:
    combined_df.to_csv(output_folder / 'combined_analysis.csv')

print(f"\n✓ Saved CSV files:")
print(f"  - ndvi_monthly.csv ({len(ndvi_df)} records)")
if len(precip_df) > 0:
    print(f"  - precipitation_monthly.csv ({len(precip_df)} records)")
    print(f"  - winter_precipitation_annual.csv")
if len(combined_df) > 0:
    print(f"  - combined_analysis.csv ({len(combined_df)} years)")

# ==================== FINAL SUMMARY ====================
print("\n" + "=" * 80)
print(" 🎉 ANALYSIS COMPLETE!")
print("=" * 80)

print(f"\n📊 Data Summary:")
print(f"  • NDVI months: {len(ndvi_df)}")
if len(precip_df) > 0:
    print(f"  • Precipitation months: {len(precip_df)}")
if len(combined_df) > 0:
    print(f"  • Combined years: {len(combined_df)}")

if top_year:
    print(f"\n🌸 Superbloom Results:")
    print(f"  • Peak year: {top_year}")
    print(f"  • Spring NDVI: {combined_df.loc[top_year, 'Spring_NDVI']:.3f}")
    print(f"  • Winter precipitation: {combined_df.loc[top_year, 'Winter_Precip_mm']:.1f} mm")
    print(f"  • Correlation: {correlation:.3f}")

print(f"\n📁 All results saved to: {output_folder.absolute()}")
print("\n" + "=" * 80)