//cd examples
//node 9dayexample.js
lib = require('../index.js');

lib.getWeather({
lat: 50,
lon: 00,
}, function(err, weather) {
// Weather for next five days (Array with five object)
weather.getNineDaySummary(function(err, summary) {
  console.log(summary)
})
});
