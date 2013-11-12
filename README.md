yr.no-forecast
=============

Wrapper to easily get weather data for a specified location in JSON format. Uses [yr.no-interface](https://github.com/evanshortiss/yr.no-interface) under the hood. See the API docs at [yr.no](http://api.yr.no/weatherapi/locationforecast/1.8/documentation). 


###Usage
Use the ```getWeather(queryStringParams, callback|stream, [VERSION])``` function to get a LocationForecast object, where version represents the version of the "locationforecast" service to use. This object has functions that take a callback as parameter and are detailed in the example below.

```
var yrno = require('yr.no-forecast');
yrno.getWeather({
  lat: 53.3478,
  lon: 6.2597
}, function(err, location) {
  // Weather for next five days (Array with five object)
  location.getFiveDaySummary(cb);
  // Current conditions
  location.getCurrentSummary(cb);
  // Weather anytime from now till future
  location.getForecastForTime(time, cb);
}, [VERSION]);
```
### Weather JSON Format
Format is somewhat inspired by that of [forecast.io](https://developer.forecast.io/) service. Not all fields will always be available. Fields that no data was retrieved for contain the null value;

```
{ 
    icon: 'PARTLYCLOUD',
    to: '2013-11-15T18:00:00Z',
    from: '2013-11-15T12:00:00Z',
    rain: '0.0 mm',
    temperature: '9.7 celcius',
    windDirection: { deg: '220.2', name: 'SW' },
    windSpeed: { mps: '2.7', beaufort: '2', name: 'Svak vind' },
    humidity: '27.9 percent',
    pressure: '1021.0 hPa',
    cloudiness: '0.0%',
    fog: '0.0%',
    lowClouds: '0.0%',
    mediumClouds: '0.0%',
    highClouds: '0.0%',
    dewpointTemperature: '-8.3 celcius',
    ...
}
```
