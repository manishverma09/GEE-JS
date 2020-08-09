var laCounty = ee.FeatureCollection("users/LA/County_Boundaries"),
var daymet = ee.ImageCollection("NASA/ORNL/DAYMET_V3"),
var ls5Sr1 = ee.ImageCollection("LANDSAT/LT05/C01/T1_SR"),
var ls7Sr1 = ee.ImageCollection("LANDSAT/LE07/C01/T1_SR"),
var ls8Sr1 = ee.ImageCollection("LANDSAT/LC08/C01/T1_SR");

//  Function to clip data to laCounty 

var areaGeom = laCounty.geometry()

var clipGeom = function (img){
  return img.clip(areaGeom)
}

// Clip for australia - Get between 1999 and 2011 - period that overlpas with 5 and 7
var ls5 = ls5Sr1.filterDate('1999-01-01', '2011-12-31').filterBounds(areaGeom)  // Do not know why clip does not work
var ls7 = ls7Sr1.filterDate('1999-01-01', '2011-12-31').filterBounds(areaGeom)
var ls8 = ls8Sr1.filterBounds(areaGeom)


// We want Landsat five and seven scenes that are close to each other in time and overlap spatially


// Experiment with some data 
var ls5Trial = ls5.filterDate('2001-01-01', '2001-12-31')
var ls7Trial = ls7.filterDate('2001-01-01', '2001-12-31')

print('LS5', ls5Trial)

var firstImg = ee.Image(ls5Trial.first())
print('Size', firstImg.select('B1').propertyNames())
print('Length', firstImg.select('B1'))
var pNames = firstImg.propertyNames()
print(pNames)

var fp5 = ee.Geometry(firstImg.get('system:footprint'))
var t1 = ee.Date(firstImg.get('system:time_start'))
print(fp5)
print(t1)

Map.addLayer(fp5)
Map.centerObject(fp5)

var nearImg = ls7Trial.filterDate(t1.advance(-1, 'day'), t1.advance(1, 'day'))
print(nearImg)

var fp7 = nearImg.filterBounds(fp5)

var fp7List = fp7.toList(fp7.size())
print(fp7List)

var fp7First = ee.Image(fp7List.get(0))

var fp7Geom1 = ee.Geometry(fp7First.get('system:footprint'))
var fp7Date1 = ee.Date(fp7First.get('system:time_start'))
print(fp7Date1)

Map.addLayer(fp7Geom1, {color: 'red'})

var fp7Second = ee.Image(fp7List.get(1))

var fp7Geom2 = ee.Geometry(fp7Second.get('system:footprint'))
var fp7Date2 = ee.Date(fp7Second.get('system:time_start'))

Map.addLayer(fp7Geom2, {color: 'green'})
print(fp7Date2)
