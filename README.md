yr.no-forecast
=============

Wrapper to easily get weather data for a specified location in JSON format. Uses [yr.no-interface](https://github.com/evanshortiss/yr.no-interface) under the hood. See the API docs at [yr.no](http://api.yr.no/weatherapi/locationforecast/1.8/documentation). 


###Usage
Use the ```getWeather(queryStringParams, callback|stream, [VERSION])``` function to get a LocationForecast object. This object has functions that take a callback as parameter and are detailed in the example below.

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
Format is inspired by that of [forecast.io](https://developer.forecast.io/) service.

```
{
	icon: 'PARTLYCLOUD',
    to: '2013-11-08T14:00:00Z',
    from: '2013-11-08T13:00:00Z',
    rain: '0.0 mm',
    temperature: '10.0',
    windSpeed: '5.0m/s',
    windBearing: '188.3',
    beaufort: '3',
    cloudCover: '77.0',
    humidity: '80.6%',
    pressure: '1006.3 hPa'
}
```
