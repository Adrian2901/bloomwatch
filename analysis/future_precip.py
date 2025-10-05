import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import requests
from pathlib import Path
from matplotlib import dates as mdates # Import the dates module for formatting

# ==================== CONFIGURATION ====================
# Define the folder where all results will be saved
output_folder = Path('future_superbloom_projections')
output_folder.mkdir(exist_ok=True) # Create the folder if it doesn't exist
print(f"📁 All results will be saved to: {output_folder.absolute()}")

# ==================== PART 1: ACQUIRING FUTURE CLIMATE DATA FROM CAL-ADAPT ====================
print("\n" + "=" * 80)
print(" STEP 1: Downloading Future Climate Projections from Cal-Adapt")
print("=" * 80)

# This is a mock function to simulate fetching data
def fetch_cal_adapt_data(start_year, end_year, emission_scenario):
    """
    This function simulates fetching downscaled climate data from Cal-Adapt.
    """
    print(f"Fetching data for {start_year}-{end_year} under {emission_scenario} scenario...")
    date_range = pd.to_datetime(pd.date_range(start=f'{start_year}-01-01', end=f'{end_year}-12-31'))
    
    # Simulate more extreme precipitation patterns (whiplash)
    precip_data = np.random.exponential(0.5, size=len(date_range))
    precip_data[precip_data < 1.5] = 0
    precip_data = precip_data * np.random.choice([1, 1, 1, 5, 10], size=len(date_range))
    
    # Simulate rising temperatures
    temp_increase = np.linspace(0, 1.5, len(date_range))
    temp_data = 15 + temp_increase + np.random.normal(0, 3, len(date_range))
    
    df = pd.DataFrame({'date': date_range, 'precipitation_mm': precip_data, 'temperature_c': temp_data})
    df.set_index('date', inplace=True)
    return df

# Fetch data for the 2025-2045 period
future_climate_df = fetch_cal_adapt_data(2025, 2045, 'RCP 4.5')
print("✓ Successfully fetched future climate projection data.")


# ==================== PART 2: APPLYING THE FUTURE SUPERBLOOM LIKELIHOOD (FSL) MODEL ====================
print("\n" + "=" * 80)
print(" STEP 2: Calculating Future Superbloom Likelihood (FSL) Score")
print("=" * 80)

def calculate_fsl_score(climate_df):
    """
    Calculates a 'Future Superbloom Likelihood' score based on key climatic drivers.
    """
    climate_df['water_year'] = climate_df.index.year
    climate_df.loc[climate_df.index.month >= 10, 'water_year'] += 1
    
    fsl_scores = {}
    
    for year in climate_df['water_year'].unique():
        if year - 1 not in climate_df['water_year'].unique() or year not in climate_df['water_year'].unique():
            continue
            
        water_year_data = climate_df[climate_df['water_year'] == year]
        fall_rains = water_year_data[water_year_data.index.month.isin([10, 11, 12])]['precipitation_mm'].sum()
        winter_spring_rains = water_year_data[water_year_data.index.month.isin([1, 2, 3])]['precipitation_mm'].sum()
        spring_avg_temp = water_year_data[water_year_data.index.month.isin([2, 3, 4])]['temperature_c'].mean()
        rainy_days = (water_year_data['precipitation_mm'] > 1).sum()
        total_precip = water_year_data['precipitation_mm'].sum()
        whiplash_factor = rainy_days / total_precip if total_precip > 0 else 0
        
        fall_rain_score = np.clip(fall_rains / 100, 0, 1)
        winter_spring_rain_score = np.clip(winter_spring_rains / 150, 0, 1)
        temp_score = 1 - np.clip((spring_avg_temp - 15) / 10, 0, 1)
        whiplash_score = np.clip(whiplash_factor * 10, 0, 1)
        
        final_score = (fall_rain_score * 0.4) + (winter_spring_rain_score * 0.3) + (temp_score * 0.2) + (whiplash_score * 0.1)
        fsl_scores[year] = final_score

    return pd.Series(fsl_scores)

fsl_series = calculate_fsl_score(future_climate_df)
# Save the calculated scores to a CSV file
fsl_series.to_csv(output_folder / 'future_superbloom_likelihood_scores.csv')
print("✓ Calculated FSL scores for future years.")
print(f"✓ Saved scores to: {output_folder / 'future_superbloom_likelihood_scores.csv'}")

# ==================== PART 3: VISUALIZING FUTURE SUPERBLOOM TRENDS ====================
print("\n" + "=" * 80)
print(" STEP 3: Creating and Saving Visualizations")
print("=" * 80)

# 1. Time series of Future Superbloom Likelihood
plt.figure(figsize=(14, 7))
plt.bar(fsl_series.index, fsl_series.values, color='purple', alpha=0.7)
plt.title('Projected Future Superbloom Likelihood in Antelope Valley (2025-2045)', fontsize=16, fontweight='bold')
plt.xlabel('Year', fontsize=12)
plt.ylabel('Future Superbloom Likelihood (FSL) Score', fontsize=12)
plt.grid(True, which='both', linestyle='--', linewidth=0.5)

# Save the plot
fsl_timeseries_path = output_folder / 'fsl_timeseries_2025-2045.png'
plt.savefig(fsl_timeseries_path, dpi=300, bbox_inches='tight')
print(f"✓ Saved time series plot to: {fsl_timeseries_path}")
plt.show()

# 2. Detailed look at a high and low likelihood year
if not fsl_series.empty:
    high_likelihood_year = fsl_series.idxmax()
    low_likelihood_year = fsl_series.idxmin()

    fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(14, 10), sharex=True)

    # --- High likelihood year ---
    high_year_data = future_climate_df[future_climate_df['water_year'] == high_likelihood_year]
    # Use the actual dates (the index) for the x-axis
    ax1.bar(high_year_data.index, high_year_data['precipitation_mm'], width=3, color='blue')
    ax1.set_title(f'High Likelihood Year: {high_likelihood_year} (FSL Score: {fsl_series.loc[high_likelihood_year]:.2f})', fontsize=14)
    ax1_temp = ax1.twinx()
    ax1_temp.plot(high_year_data.index, high_year_data['temperature_c'].rolling(30).mean(), color='red', linestyle='--')
    ax1.set_ylabel('Daily Precipitation (mm)', color='blue', fontsize=12)
    ax1_temp.set_ylabel('30-Day Avg Temperature (°C)', color='red', fontsize=12)

    # --- Low likelihood year ---
    low_year_data = future_climate_df[future_climate_df['water_year'] == low_likelihood_year]
    # Use the actual dates (the index) for the x-axis
    ax2.bar(low_year_data.index, low_year_data['precipitation_mm'], width=3, color='blue')
    ax2.set_title(f'Low Likelihood Year: {low_likelihood_year} (FSL Score: {fsl_series.loc[low_likelihood_year]:.2f})', fontsize=14)
    ax2_temp = ax2.twinx()
    ax2_temp.plot(low_year_data.index, low_year_data['temperature_c'].rolling(30).mean(), color='red', linestyle='--')
    ax2.set_ylabel('Daily Precipitation (mm)', color='blue', fontsize=12)
    ax2_temp.set_ylabel('30-Day Avg Temperature (°C)', color='red', fontsize=12)

    # --- FORMAT THE X-AXIS TO SHOW MONTHS ---
    # Set the format of the date labels to show abbreviated month (e.g., 'Oct', 'Nov')
    ax2.xaxis.set_major_formatter(mdates.DateFormatter('%b'))
    # Set the locator to place a tick for each month
    ax2.xaxis.set_major_locator(mdates.MonthLocator())
    # Automatically format the date labels to fit nicely
    fig.autofmt_xdate()

    plt.tight_layout()
    
    # Save the comparison plot
    comparison_plot_path = output_folder / 'high_vs_low_likelihood_years.png'
    plt.savefig(comparison_plot_path, dpi=300, bbox_inches='tight')
    print(f"✓ Saved comparison plot to: {comparison_plot_path}")
    plt.show()

print("\n" + "=" * 80)
print(" 🎉 ANALYSIS COMPLETE!")
print(f" All results have been saved to the '{output_folder}' directory.")
print("=" * 80)