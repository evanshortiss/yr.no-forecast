//cd examples
//node 9dayexample.js
lib = require('../index.js');

//five day forecast
lib.getWeather({
lat: 50,
lon: 00,
}, function(err, weather) {
// Weather for next five days (Array with five object)
weather.getWeatherForNextDays(days=5,function(err, summary) {
  console.log(summary)
})
});

//week-long forecast
lib.getWeather({
lat: 50,
lon: 00,
}, function(err, weather) {
// Weather for next five days (Array with five object)
weather.getWeatherForNextDays(days=7,function(err, summary) {
  console.log(summary)
})
});
