
// Google Earth Engine Script for GPM IMERG Precipitation
// Copy this to: https://code.earthengine.google.com/

// Define area of interest
var aoi = ee.Geometry.Rectangle([-118.3, 34.4, 
                                  -117.9, 34.7]);

// Load GPM IMERG dataset
var gpm = ee.ImageCollection('NASA/GPM_L3/IMERG_V06')
  .filterDate('2015-01-01', '2023-12-31')
  .filterBounds(aoi)
  .select('precipitation');

// Calculate monthly totals (mm)
var monthlyPrecip = gpm
  .filter(ee.Filter.calendarRange(2015, 2023, 'year'))
  .map(function(img) {
    return img.multiply(0.5); // Convert mm/hr to mm per 30min
  });

// Aggregate by month
var months = ee.List.sequence(1, 12);
var years = ee.List.sequence(2015, 2023);

var monthlyImages = years.map(function(year) {
  return months.map(function(month) {
    var filtered = monthlyPrecip
      .filter(ee.Filter.calendarRange(year, year, 'year'))
      .filter(ee.Filter.calendarRange(month, month, 'month'));
    var total = filtered.sum();
    return total.set('year', year).set('month', month);
  });
}).flatten();

// Visualization
var precipVis = {
  min: 0,
  max: 200,
  palette: ['white', 'blue', 'darkblue', 'purple', 'red']
};

// Display
Map.centerObject(aoi, 10);
Map.addLayer(ee.ImageCollection(monthlyImages).first().clip(aoi), 
             precipVis, 'Monthly Precipitation');

// Export to Google Drive
var exportImage = ee.ImageCollection(monthlyImages).first();
Export.image.toDrive({
  image: exportImage.clip(aoi),
  description: 'GPM_Precipitation_Monthly',
  scale: 11132,  // ~11km resolution
  region: aoi,
  maxPixels: 1e13
});

print('Total images:', monthlyImages.size());
