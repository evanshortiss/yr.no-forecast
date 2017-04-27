yr.no-forecast
==============

Wrapper to easily get weather data for a specified location in JSON format. Uses [yr.no-interface](https://github.com/evanshortiss/yr.no-interface) under the
hood. See the API docs at [yr.no](http://api.yr.no/weatherapi/locationforecast/1.9/documentation).


## Usage
Use the ```getWeather(queryParams, [version])``` function to get a
LocationForecast object, where `version` represents the version of the
"locationforecast" service to use. 1.9 is the default.

This object has functions that take a callback as parameter and are detailed in
the example below.

```js
const yrno = require('yr.no-forecast')({
  version: '1.9'
});

const LOCATION = {
  // This is Dublin, Ireland
  lat: 53.3478,
  lon: 6.2597
};

yrno.getWeather(LOCATION).then((weather) => {
  // Get general weather for next five days (Array with five objects)
  weather.getFiveDaySummary()
    .then((data) => console.log(data));

  // Get a weather data point for a given time between now and 9 days ahead
  weather.getForecastForTime(time)
    .then((data) => console.log(data));
});
```

## API

### module(config)
This module exports a single factory function that can be used to get a
configured instance that exports the `getWeather` function.

Currently supported config options:

* version - This will be passed when making a call to the met.no API


### module.getWeather(params, [version])
Returns a Promise that will resolve with a `LocationForecast` object that
contains functions to get weather data.

### LocationForecast.getFiveDaySummary()
Returns a Promise that resolves to an Array of 5 weather data Objects.

### LocationForecast.getForecastForTime(time)
Returns a Promise that resolves to a weather data Object that is closest to the
provided `time` argument. The `time` argument will be passed to `moment.utc` so
many time formats will work, but a millisecond timestamp or ISO formatted date
string are both ideal options to use use.

### LocationForecast.getXml()
Returns the XML string that the locationforecast API returned.

### LocationForecast.getJson()
Returns the JSON representation of a locationforecast response.

### LocationForecast.getFirstDateInPayload()
Returns the first date string that is available in the data returned from the
locationforecast call.


## Weather JSON Format
Format is somewhat inspired by that of the
[forecast.io](https://developer.forecast.io/) service.

Some fields will be undefined depending on the weather conditions. Always
verify the field you need exists by using `data.hasOwnProperty('fog')`
or similar techniques.

```js
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
    dewpointTemperature: '-8.3 celcius'
}
```
