'use strict';

const yrno = require('../index.js')({
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

console.log('\nGetting weather for Dublin, Ireland...\n');

yrno.getWeather(LOCATION)
  .then((weather) => {
    // Get general weather for next five days (Array with five objects)
    // weather.getFiveDaySummary()
    //   .then((data) => console.log('\n five day summary', data));

    // Get a weather data point for a given time between now and 9 days ahead
    weather.getForecastForTime(new Date())
      .then((data) => {
        if (data.hasOwnProperty('temperature')) {
          console.log(`Temperature is around ${data.temperature}`);
        }

        if (data.hasOwnProperty('rain')) {
          console.log(`Expected rainfall is ${data.rain}`);
        }

        if (data.hasOwnProperty('humidity')) {
          console.log(`Humidity is ${data.humidity}`);
        }

        console.log('\n');
      });
  })
  .catch((e) => {
    console.log('an error occurred getting weather xml!', e);
  });
