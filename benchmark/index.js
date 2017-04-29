
const Benchmark = require('benchmark');
const suite = new Benchmark.Suite;
const readFileSync = require('fs').readFileSync;
const join = require('path').join;
const sinon = require('sinon');
const yrno = {
  locationforecast: sinon.stub().yields(
    null,
    readFileSync(join(__dirname, '../fixtures/weather-response-oslo.xml'), 'utf8')
  )
};
const forecast = require('proxyquire')('../index.js', {
  'yr.no-interface': sinon.stub().returns(yrno)
});

suite
  .add(
    '#getFiveDaySummary',
    (deffered) => {
      forecast().getWeather()
        .then((weather) => weather.getFiveDaySummary())
        .then(() => deffered.resolve());
    },
    {defer: true}
  )
  .add(
    '#getForecastForTime',
    (deffered) => {
      forecast().getWeather()
        .then((weather) => weather.getFiveDaySummary())
        .then(() => deffered.resolve());
    },
    {defer: true}
  )
  .on('cycle', function(event) {
    console.log(String(event.target));
  })
  .run();
