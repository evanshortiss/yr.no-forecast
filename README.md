yr.no-forecast
==============

![TravisCI](https://travis-ci.org/evanshortiss/yr.no-forecast.svg) [![npm version](https://badge.fury.io/js/yr.no-forecast.svg)](https://badge.fury.io/js/yr.no-forecast) [![Coverage Status](https://coveralls.io/repos/github/evanshortiss/yr.no-forecast/badge.svg?branch=master)](https://coveralls.io/github/evanshortiss/yr.no-forecast?branch=master)

Wrapper to easily get weather data for a specified location in JSON format. Uses [yr.no-interface](https://github.com/evanshortiss/yr.no-interface) under the
hood. See the API docs at [yr.no](http://api.yr.no/weatherapi/locationforecast/1.9/documentation).


## Usage
Use the ```getWeather(queryParams)``` function to get a
LocationForecast object by calling the "locationforecast" API.

Here's an example:


```js
const yrno = require('yr.no-forecast')({
  version: '1.9', // this is the default if not provided,
  request: {
    // make calls to locationforecast timeout after 15 seconds
    timeout: 15000
  }
});

const LOCATION = {
  // This is Dublin, Ireland
  lat: 53.3478,
  lon: 6.2597
};

yrno.getWeather(LOCATION)
  .then((weather) => {
    // Get general weather for next five days (Array with five objects)
    weather.getFiveDaySummary()
      .then((data) => console.log('five day summary', data));

    // Get a weather data point for a given time between now and 9 days ahead
    weather.getForecastForTime(new Date())
      .then((data) => console.log('current weather', data));
  })
  .catch((e) => {
    console.log('an error occurred!', e);
  });
```

## API

### module(config)
This module exports a single factory function that can be used to get a
configured `instance` that exports the `getWeather` function.

Currently supported config options:

* version - Passed when making a call to the met.no API to select the
locationforecast version to call
* request - Can be populated with options for the `request` module. The only
setting that you should need to pass is `timeout` and is demonstrated above


### instance.getWeather(params[, version])
Returns a Promise that will resolve with a `LocationForecast` object that
contains functions to get weather data. You can pass the version parameter if
you want to override the default of 1.9, or the default you supplied when
creating and instance.

### LocationForecast.getFiveDaySummary()
Returns a Promise that resolves to an Array of 5 weather data Objects.

### LocationForecast.getForecastForTime(time)
Returns a Promise that resolves to a weather data Object that is closest to the
provided `time` argument. The `time` argument will be passed to `moment.utc` so
many time formats will work, but a millisecond timestamp or ISO formatted date
string are both ideal options to use use.

### LocationForecast.getXml()
Returns the raw XML string that the `locationforecast` API returned.

### LocationForecast.getJson()
Returns the JSON representation of the entire `locationforecast` response.

### LocationForecast.getFirstDateInPayload()
Returns the first date string that is available in the data returned from the
locationforecast call.

### LocationForecast.getValidTimes()
Returns an Array of ISO timestamps that represent points in time that we have
weather data for.


## Weather JSON Format

Some fields will be undefined depending on the weather conditions. Always
verify the field you need exists, e.g use `data.hasOwnProperty('fog')` or
similar techniques.

```json
{
  "datatype": "forecast",
  "from": "2017-04-18T03:00:00Z",
  "to": "2017-04-18T03:00:00Z",
  "icon": "PartlyCloud",
  "rain": "0.0 mm",
  "altitude": "0",
  "latitude": "59.8940",
  "longitude": "10.6450",
  "temperature": {
    "id": "TTT",
    "unit": "celsius",
    "value": "-0.9"
  },
  "windDirection": {
    "id": "dd",
    "deg": "14.6",
    "name": "N"
  },
  "windSpeed": {
    "id": "ff",
    "mps": "1.5",
    "beaufort": "1",
    "name": "Flau vind"
  },
  "windGust": {
    "id": "ff_gust",
    "mps": "2.4"
  },
  "humidity": {
    "value": "78.3",
    "unit": "percent"
  },
  "pressure": {
    "id": "pr",
    "unit": "hPa",
    "value": "1030.1"
  },
  "cloudiness": {
    "id": "NN",
    "percent": "15.4"
  },
  "fog": {
    "id": "FOG",
    "percent": "0.0"
  },
  "lowClouds": {
    "id": "LOW",
    "percent": "15.4"
  },
  "mediumClouds": {
    "id": "MEDIUM",
    "percent": "0.8"
  },
  "highClouds": {
    "id": "HIGH",
    "percent": "0.0"
  },
  "dewpointTemperature": {
    "id": "TD",
    "unit": "celsius",
    "value": "-4.5"
  }
}
```

## CHANGELOG

Can be found [at this link](https://github.com/evanshortiss/yr.no-forecast/blob/master/CHANGELOG.md ).
