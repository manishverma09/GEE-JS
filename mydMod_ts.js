/* Analysis of OCO-2 data near Flux Tower sites. The motivation is to develop one of more methods to estimate SIF at the tower site.
Naive Geostatistical methods with stationary kernel do not give good estimates but are a good starting point. I hope to incorporate noise 
SIF as I develop this more, but for now I am ignoring it.
*/
var fluxtower = ee.FeatureCollection("users/fluxtower")     //Tower locations
var mod13 = ee.ImageCollection("MODIS/006/MOD13A1")
var myd13 = ee.ImageCollection("MODIS/006/MYD13A1")
var mod11a1 = ee.ImageCollection("MODIS/006/MOD11A1")
var myd11a1 = ee.ImageCollection("MODIS/006/MYD11A1")
var soilAus = ee.ImageCollection("CSIRO/SLGA")
var demAus = ee.Image("AU/GA/DEM_1SEC/v10/DEM-S")
var sentinel1 = ee.ImageCollection("COPERNICUS/S1_GRD")
var oco14_15 = ee.FeatureCollection("mydata/SturtPlains_14_15")       // OCO-2 SIF, not yet available in GEE, so you will have to upload it
var mcd43 = ee.ImageCollection("MODIS/006/MCD43A4")
var stPl = /* color: #d63000 */ee.Geometry.Point([133.3502, -17.1507])
var oco14_17 = ee.FeatureCollection("users/manishve/SIF/sifStPlains")
var usdaSoilMoist = ee.ImageCollection("NASA_USDA/HSL/soil_moisture")
var lai_fpar = ee.ImageCollection("MODIS/006/MCD15A3H")
var mcd12q1 = ee.ImageCollection("MODIS/006/MCD12Q1")


// 0. Mark flux tower site and get the area covered by the OCO observations

Map.addLayer({eeObject:stPl, name: 'SturtPlains'})

var ocoGeom = oco14_17.geometry().convexHull()

Map.addLayer({eeObject:ocoGeom, name: 'ConvexHull'})

//  1. GET OCO2 DATA #############

print(ee.Feature(oco14_17.first()).propertyNames())

// Get date (X), SIF at 757 (SIF_757n), SIF at 771 nm (SIF_771n), solar zenith anlge (slr_zn), sensor zenith angle (snsr_zn)),
//longitude (lngtd), letitude (lattd)

// Time and date are in local system (Ian already took care of it when extracting the data from the netcdf files)

var oco1 = oco14_17.select(['X', 'SIF_757n', 'SIF_771n', 'slr_zn', 'snsr_zn', 'lngtd', 'lattd']);


var dateTime = function (ft)
               {
                var tmp = ft.get('X')
                    tmp = ee.String(ee.String(tmp).split(' ').get(0))
                    return ft.set({date:tmp})
               }

oco1 = oco1.map (dateTime)
oco1 = oco1.sort('date')

// Find starting and final date in the oco-2 dataset

var sizeOco = oco1.size()

print (sizeOco)

var stDate = ee.Date(ee.Feature(oco1.first()).get('date'));

var endDate = oco1.toList(ee.Number(sizeOco), ee.Number(sizeOco).subtract(ee.Number(1)))
endDate = ee.Date(ee.Feature(ee.List(endDate).get(0)).get('date'));

print('Starting Date', stDate)        // Starting dat1
print('End Date', endDate)        // Final date

// Check the geometry of oco-2 observations for a random date

var geomOco1 = oco1.filterMetadata('date', 'equals', '2015-02-08')

print('GeomOCO', geomOco1)

var geomOco2 = geomOco1.geometry()

Map.addLayer({eeObject: geomOco2, name: 'OCO Footprint'})
Map.centerObject(geomOco2)


// 2. GET COVARIATES (EVI) #############

// Find band names and get the ones that we want
var img1 = ee.Image(mod13.first())
var bandNames = img1.bandNames();
print (bandNames)

// Retrieve for the relevant time and geographical area -
mod13 = mod13.select(['EVI', 'NDVI', 'DayOfYear', 'DetailedQA', 'SummaryQA'])
mod13 = mod13.filterDate(stDate.advance({delta:-16, unit:'day'}), endDate.advance({delta:16, unit:'day'})).filterBounds(ocoGeom);

var mod13Dates = mod13.aggregate_array('system:time_start');

var mod13Dates = ee.List(mod13Dates).map (function (lt){ return (ee.Date(lt))});

print('MOD13 Dates', mod13Dates)

mod13 = mod13.map (function (img){
  return img.clip(ocoGeom)});
  
// Add 365 to day of year band for 2015, 365*2 for 2016 and 3*365 for 2017
var constImg0 = ee.Image.constant(ee.Number(0)).rename('DayOfYear')
var constImg1 = ee.Image.constant(ee.Number(365)).rename('DayOfYear')
var constImg2 = ee.Image.constant(ee.Number(365).multiply(ee.Number(2))).rename('DayOfYear')
var constImg3 = ee.Image.constant(ee.Number(365).multiply(ee.Number(3))).rename('DayOfYear')


var mod13_1 = mod13.filterDate('2014-01-01', '2014-12-31')
var mod13_2 = mod13.filterDate('2015-01-01', '2015-12-31')
var mod13_3 = mod13.filterDate('2016-01-01', '2016-12-31')
var mod13_4 = mod13.filterDate('2017-01-01', '2017-12-31')

var mod13_1 = mod13_1.map(function (img)
              {
              var doy = img.select('DayOfYear').add(constImg0)
              return img.addBands(doy)                          //addBands(doy, [], true) does not add band
              })


var mod13_2 = mod13_2.map(function (img)
              {
              var doy = img.select('DayOfYear').add(constImg1)
              return img.addBands(doy)                          //addBands(doy, [], true) does not add band
              })
              
var mod13_3 = mod13_3.map(function (img)
              {
              var doy = img.select('DayOfYear').add(constImg2)
              return img.addBands(doy)
              })
              
var mod13_4 = mod13_4.map(function (img)
              {
              var doy = img.select('DayOfYear').add(constImg3)
              return img.addBands(doy)
              })
              
var modTmp1 = ee.Image(mod13_4.first());
var modBnames = modTmp1.bandNames();
print (modBnames);

var modTmp1 = modTmp1.select('DayOfYear_1');

Map.addLayer({eeObject: modTmp1, name: 'Modis Tera'});
Map.centerObject(modTmp1);

// MYD

myd13 = myd13.select(['EVI', 'NDVI', 'DayOfYear', 'DetailedQA', 'SummaryQA'])
myd13 = myd13.filterDate(stDate.advance({delta:-16, unit:'day'}), endDate.advance({delta:16, unit:'day'})).filterBounds(ocoGeom);
myd13 = myd13.map (function (img){
return img.clip(ocoGeom)});
  
  
var myd13_1 = myd13.filterDate('2014-01-01', '2014-12-31')
var myd13_2 = myd13.filterDate('2015-01-01', '2015-12-31')
var myd13_3 = myd13.filterDate('2016-01-01', '2016-12-31')
var myd13_4 = myd13.filterDate('2017-01-01', '2017-12-31')

var myd13_1 = myd13_1.map(function (img)
              {
              var doy = img.select('DayOfYear').add(constImg0)
              return img.addBands(doy)                          //addBands(doy, [], true) does not add band
              })

var myd13_2 = myd13_2.map(function (img)
              {
              var doy = img.select('DayOfYear').add(constImg1)
              return img.addBands(doy)
              })
              
var myd13_3 = myd13_3.map(function (img)
              {
              var doy = img.select('DayOfYear').add(constImg2)
              return img.addBands(doy)
              })

var myd13_4 = myd13_4.map(function (img)
              {
              var doy = img.select('DayOfYear').add(constImg3)
              return img.addBands(doy)
              })

// Check to make sure tha the procedure is working
var mydTmp1 = ee.Image(myd13_4.first())
var mydBnames = mydTmp1.bandNames()
print (mydBnames)

var mydTmp1 = mydTmp1.select('DayOfYear_1')

Map.addLayer({eeObject: mydTmp1, name: 'Modis Aqua'});
Map.centerObject(mydTmp1);

// Stack the two to create a common modis (assuming that there is no systematic bias in the two)

var mcd13 = mod13_1.toList(mod13_1.size()).cat(mod13_2.toList(mod13_2.size()))
            .cat(mod13_3.toList(mod13_3.size())).cat(mod13_4.toList(mod13_4.size()))
            .cat(myd13_1.toList(myd13_1.size())).cat(myd13_2.toList(myd13_2.size()))
            .cat(myd13_3.toList(myd13_3.size())).cat(myd13_4.toList(myd13_4.size()));

var mcd13 = ee.ImageCollection(mcd13).sort('system:time_start');

print('MCD13', mcd13);

// 3. Let us do some plotting ###################

// 3.1 Plot VIs

var trial = mcd13.map (function (img){
            return img.clip(stPl)});
print(trial);

var trialChart = ui.Chart.image.series({
  imageCollection: trial.select(['EVI']),
  region: stPl,
  reducer: ee.Reducer.max(),
  scale: 500
  
})

print (trialChart)

// Plot SIF and VIs
print ('Serialized Date', stDate.format('YYYY-MM-dd'))
var trialSif = oco1.filterMetadata('date', 'equals', stDate.format('YYYY-MM-dd'));
print('Day1 SIF', trialSif)

Map.addLayer ({eeObject: trialSif, name: 'SIF Footprint'})


// 4. Interpolate EVI ##############
// We want to estimate EVI for every day using both parametric and nonparametric options
// Without using Quality bits - consider that we want to fit f(x, theta) to EVI of each pixel.
//Here f is nonlinear and theta is a parameter vector, and x is day of year

// 4.1 ######  Let us first do kernel smoothing and interpolate daily VI

var totalDays = ee.Date(endDate).difference(ee.Date(stDate), 'day');   // Total days
print('Total Days', totalDays)

var startDoy = ee.Date(stDate).difference(ee.Date('2014-01-01'), 'day') // Day of year of the very first data in the image collection
print ('Start DoY', startDoy)

var dailyDoy = ee.List.sequence(ee.Number(startDoy), ee.Number(startDoy).add(ee.Number(totalDays)));
print('Daily DoY', dailyDoy);

var dailyDoy = dailyDoy.map(function (list_element)
               {
                 return ee.Image.constant(list_element).set('system:time_start', ee.Number(list_element).subtract(ee.Number(281)));   // THIS NEEDS BETTER STRATEGY TO SET CORRECT TIME
               });

var dailyDoy = ee.ImageCollection(dailyDoy)
print('Daily DoY', dailyDoy)


var mcd13Doy = mcd13.select('DayOfYear_1')
print('MCD13_DayOfYear', mcd13Doy)

var stdImg = ee.Image.constant(ee.Number(32))    // Scale of the kernel akin to STD or variance of a gaussian
var evi = mcd13.select('NDVI')
print('EVI', evi)

// Convert image collection to image for further processing
var empty1 = ee.Image().select(); // Make an empty image

var mcd13DoyImg = mcd13Doy.iterate(function (img1, result1)
           {return ee.Image(result1).addBands(img1)
           }, empty1)
           
//mcd13DoyImg = mcd13DoyImg.rename('DayOfYear')
print('MCD13_DayOfYear', mcd13DoyImg)     // Do we need to rename band-name

var empty2 = ee.Image().select(); // Make an empty image

var mcd13EviImg = evi.iterate(function (img2, result2){return ee.Image(result2).addBands(img2)}, empty2);

print('MCD13_EVI', mcd13EviImg)

var smoothEvi = dailyDoy.map (function (img)
               {
               var kernel = img.subtract(mcd13DoyImg);
               kernel = kernel.pow(ee.Image.constant(ee.Number(2)));
               kernel = kernel.divide(stdImg).multiply(ee.Image.constant(ee.Number(-1)));
               kernel = kernel.exp();
               var kernelSum = kernel.reduce(ee.Reducer.sum());
               kernel = kernel.divide(kernelSum);
               var kernelMean = kernel.multiply(mcd13EviImg).reduce(ee.Reducer.sum());
               return img.addBands(kernelMean).rename(['DaySince2014', 'SmoothEvi']);
               }
               );

print('Smooth EVI', smoothEvi);

print('Smooth EVI Days', smoothEvi.aggregate_array('system:time_start'));

// Plot and examine the data


var trialSmoothEvi = smoothEvi.map (function (img)
                    {
                    return img.clip(stPl);
                      
                    });


var trialChart1 = ui.Chart.image.series({
  imageCollection: trialSmoothEvi.select(['SmoothEvi']),
  region: stPl,
  reducer: ee.Reducer.mean(),
  scale: 1000
  
})

print ('Smooth EVI', trialChart1)


// 5. Terrain ###########

var demStPl = demAus.clip (ocoGeom);

var histElevation = ui.Chart.image.histogram(
                   {image: demStPl,
                   region: ocoGeom,
                   scale: 1000,
                   maxBuckets: 10});
print (histElevation)

Map.addLayer({eeObject: demStPl, visParams: {min:212, max:252, palette: ['00FFFF', '0000FF']}, name: 'Elevation'});

// 6. Modis land cover ###########

var mcd12q1 = mcd12q1.map (function (img)
              {
                return img.clip(ocoGeom);
              });

var mcd12q1_2013 = ee.Image(mcd12q1.filterDate('2013-01-01', '2013-12-31').first())

print()

var lc = mcd12q1_2013.select('Land_Cover_Type_1')

var histLc = ui.Chart.image.histogram(
                   {image: lc,
                   region: ocoGeom,
                   scale: 1000});
print (histLc)

Map.addLayer({eeObject: lc, visParams: {min:7, max:11, palette: ['00FFFF', '0000FF'], opacity:0.5},
              name: 'LandCover'})

// ##### 7. Add smooth EVI  to each OCO feature

// Combine SIF, EVI. smoothEvi image collection has system:time_start property that start from 1 and increments by 1

// Smooth EVI starts from day 2014-10-10 (first day of oco) - 8  i.e. system:time_start=9 OR 2014-10-02 is system:time_start=1

print ('OCO-Feature', ee.Feature(oco1.first()).get('date'))

// Trial first on a feature
var ft = ee.Feature(oco1.first())

var ftDate = ee.Date(ft.get('date')).difference(ee.Date('2014-01-01'), 'day');
print(ftDate)
var eviFtDate = smoothEvi.filter(ee.Filter.eq('system:time_start', ee.Number(1))); // It is a image collection, but with one image only

print(eviFtDate)

// Now implement the loop
var oco1 = oco1.map (function (ft)
           {
             var ftDate = ee.Feature(ft).get('date');
             var ftDateSystemTime = ee.Number(ee.Date(ftDate).difference(ee.Date('2014-10-2'), 'day'));
             var eviFtDate = smoothEvi.filter(ee.Filter.eq('system:time_start', ftDateSystemTime)); // It is a image collection, but with one image only
             eviFtDate = ee.Image(eviFtDate.first());
             //ft = ft.set({constant:1});
             var eviSifFtDate = eviFtDate.reduceRegion(
                 {
                   geometry: ft.geometry(),
                   reducer: ee.Reducer.mean(),
                   scale: 500
                 });
             ft = ft.set({'EVI':eviSifFtDate.get('SmoothEvi'), 'Doy': eviSifFtDate.get('DaySince2014')})
             return (ft);
           });
           

print ('First Feature', ee.Feature(oco1.first()));

// Add mean SIF: mean of sif_757 and sif_771

var oco1 = oco1.map (function (ft)
           {
             var sif1 = ee.Number(ft.get('SIF_757n'));
             var sif2 = ee.Number(ft.get('SIF_771n'));
             
             var meanSif = sif1.add(sif2).divide(ee.Number(2))
             
             ft = ft.set({'mean_sif':meanSif})
             return (ft);
           });


var sizeOco1 = oco1.size()

print('OCO1 Elements', sizeOco1)

var oco1List = oco1.toList(ee.Number(100))

print('OCO1 List', oco1List)

Export.table.toDrive({collection: oco1, description: 'StPlains_ocoEvi'});

// EVI SIF scatter plot

var ocoEviDay = oco1.filterMetadata('date', 'equals', '2015-02-08');

print (ocoEviDay)

var x = ocoEviDay.select(['EVI']);
var y = ocoEviDay.select(['mean_sif']);

print(x)
print(y)

var chart = ui.Chart.feature.byFeature(ocoEviDay, 'EVI', 'mean_sif');

chart = chart.setOptions({
  hAxis: { title: "EVI", viewWindow: {min:4000, max:6000} },
  vAxis: { title: 'SIF', viewWindow: {min:-0.5, max:1.5} },
  pointSize: 1,
  lineWidth: 0,
  legend: 'none'
});
print(chart);
