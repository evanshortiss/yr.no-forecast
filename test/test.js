'use strict';

const moment = require('moment');
const proxyquire = require('proxyquire');
const sinon = require('sinon');
const chai = require('chai');
const readFileSync = require('fs').readFileSync;
const join = require('path').join;

chai.use(require('chai-truthy'));
var expect = require('chai').expect;

const SAMPLE_XML = readFileSync(
  join(__dirname, '../fixtures/weather-response-oslo.xml'), 'utf8'
);


const LOCATION = {
  lat: 53.3478,
  lon: 6.2597
};

describe('yr.no-forecast', function() {
  this.timeout(5000);

  var lib, stubs, yrno;

  var YRNO = 'yr.no-interface';

  beforeEach(function () {
    yrno = {
      locationforecast: sinon.stub().yields(null, SAMPLE_XML)
    };

    stubs = {
      [YRNO]: sinon.stub().returns(yrno)
    };

    lib = proxyquire('../index.js', stubs);
  });

  describe('#getWeather', function () {
    it('should return an error for malformed xml payloads', function () {
      stubs[YRNO]({}).locationforecast.yields(null, '<xml><invalid </invalid></xml>');

      return lib().getWeather(LOCATION)
        .then(() => {
          throw new Error('not meant to be here');
        })
        .catch(function (err) {
          expect(err).to.be.truthy();
          expect(err.toString()).to.contain('Parse Error: Mismatched closing tag');

          expect(
            yrno.locationforecast.getCall(0).args[0]
          ).to.deep.equal({
            version: 1.9,
            query: LOCATION
          });
        });
    });

    it('should return an error on yr.no API errors', function () {
      stubs[YRNO]({}).locationforecast.yields(new Error('oh noes!'));

      return lib().getWeather(LOCATION)
        .then(() => {
          throw new Error('not meant to be here');
        })
        .catch(function (err) {
          expect(err).to.be.truthy();
          expect(err.toString()).to.contain('oh noes!');
        });
    });

    it('should return an object with LocationForecast methods', function() {
      return lib().getWeather(LOCATION)
        .then(function(weather) {
          expect(weather).to.be.an('object');
          expect(weather.xml).to.be.a('string');
          expect(weather.json).to.be.an('object');

          expect(weather.json.weatherdata).to.be.an('object');
          expect(weather.json.weatherdata.created).to.be.a('string');
          expect(weather.json.weatherdata.meta).to.be.an('object');
          expect(weather.json.weatherdata.product).to.be.an('object');
        });
    });

    it('should use custom version from config', () => {
      const version = 2.1;

      return lib({version: version}).getWeather(LOCATION)
        .then(function() {
          expect(
            yrno.locationforecast.getCall(0).args[0].version
          ).to.equal(version);
        });
    });

    it('should use custom version from args to getWeather', () => {
      const version = 2.1;

      return lib().getWeather(LOCATION, version)
        .then(function() {
          expect(
            yrno.locationforecast.getCall(0).args[0].version
          ).to.equal(version);
        });
    });
  });

  describe('#getXml', function () {
    it('should return a string', function () {
      return lib().getWeather(LOCATION)
        .then(function (weather) {
          expect(weather).to.be.truthy();
          expect(weather.getXml()).to.be.a('string');
        });
    });
  });


  describe('#getJson', function () {
    it('should return a value', function () {
      return lib().getWeather(LOCATION)
        .then(function (weather) {
          expect(weather).to.be.truthy();
          expect(weather.getJson()).to.be.an('object');
        });
    });
  });


  describe('#getFiveDaySummary', function () {
    it('should return array with 5 weather objects', function() {
      return lib().getWeather(LOCATION)
        .then(function(weather) {
          expect(weather).to.be.an('object');
          return weather.getFiveDaySummary();
        })
        .then(function (summary) {
          expect(summary).to.be.an('array');
          expect(summary).to.have.length(5);

          var prev = null;

          summary.forEach(function (cur) {
            if (prev) {
              expect(moment(prev.from).isBefore(moment(cur.from))).to.be.true;
            }

            prev = cur;

            expect(cur.icon).to.be.a('string');
            expect(cur.to).to.be.a('string');
            expect(cur.from).to.be.a('string');
            expect(cur.rain).to.be.a('string');
            expect(cur.temperature).to.be.an('object');
            expect(cur.windDirection).to.be.an('object');
            expect(cur.windSpeed).to.be.an('object');
            expect(cur.humidity).to.be.an('object');
            expect(cur.pressure).to.be.an('object');
            expect(cur.cloudiness).to.be.an('object');
            expect(cur.lowClouds).to.be.an('object');
            expect(cur.mediumClouds).to.be.an('object');
            expect(cur.highClouds).to.be.an('object');
            expect(cur.dewpointTemperature).to.be.an('object');
          });
        });
    });
  });

  describe('#getValidTimestamps', function () {
    it('should return an array of ISO timestamps', function () {
      return lib().getWeather(LOCATION)
        .then((weather) => weather.getValidTimestamps())
        .then(function (times) {
          expect(times).to.be.an('array');
          expect(times[0]).to.equal('2017-04-18T13:00:00Z');
        });
    });
  });

  describe('#getForecastForTime', function () {
    it('should return an error for invalid date arguments', function () {
      return lib().getWeather(LOCATION)
        .then(function(weather) {
          expect(weather).to.be.an('object');
          return weather.getForecastForTime('bad time string');
        })
        .catch(function (err) {
          expect(err).to.be.an('error');
          expect(err.toString()).to.contain(
            'Invalid date provided for weather lookup'
          );
        });
    });

    it('should return null if date is not in range', function () {
      return lib().getWeather(LOCATION)
        .then(function(weather) {
          expect(weather).to.be.an('object');

          return weather.getForecastForTime(moment.utc('2017-04-15'));
        })
        .then(function (forecast) {
          expect(forecast).to.equal(null);
        });
    });

    it('should get weather for 10:00 PM (22:00) by rounding up', function() {
      var time = moment.utc('2017-04-18');
      time.set('hours', 21);
      time.set('minutes', 35);

      return lib().getWeather(LOCATION)
        .then(function(weather) {
          return weather.getForecastForTime(time);
        })
        .then(function (forecast) {
          expect(forecast).to.be.an('object');
          expect(forecast.icon).to.be.a('string');
          expect(forecast.to).to.be.a('string');
          expect(forecast.from).to.be.a('string');
          expect(forecast.rain).to.be.a('string');
          expect(forecast.temperature).to.be.an('object');
          expect(forecast.windDirection).to.be.an('object');
          expect(forecast.windSpeed).to.be.an('object');
          expect(forecast.windGust).to.be.an('object');
          expect(forecast.humidity).to.be.an('object');
          expect(forecast.pressure).to.be.an('object');
          expect(forecast.cloudiness).to.be.an('object');
          expect(forecast.fog).to.be.an('object');
          expect(forecast.lowClouds).to.be.an('object');
          expect(forecast.mediumClouds).to.be.an('object');
          expect(forecast.highClouds).to.be.an('object');
          expect(forecast.dewpointTemperature).to.be.an('object');
        });
    });

    it('should get weather for 9:00 PM (21:00) by rounding down', function() {
      var time = moment.utc('2017-04-18');
      time.set('hours', 21);
      time.set('minutes', 20);

      return lib().getWeather(LOCATION)
        .then(function(weather) {
          return weather.getForecastForTime(time);
        })
        .then(function (forecast) {
          expect(forecast).to.be.an('object');
          expect(forecast.icon).to.be.a('string');
          expect(forecast.to).to.be.a('string');
          expect(forecast.from).to.be.a('string');
          expect(forecast.rain).to.be.a('string');
          expect(forecast.temperature).to.be.an('object');
          expect(forecast.windDirection).to.be.an('object');
          expect(forecast.windSpeed).to.be.an('object');
          expect(forecast.windGust).to.be.an('object');
          expect(forecast.humidity).to.be.an('object');
          expect(forecast.pressure).to.be.an('object');
          expect(forecast.cloudiness).to.be.an('object');
          expect(forecast.fog).to.be.an('object');
          expect(forecast.lowClouds).to.be.an('object');
          expect(forecast.mediumClouds).to.be.an('object');
          expect(forecast.highClouds).to.be.an('object');
          expect(forecast.dewpointTemperature).to.be.an('object');
        });
    });

    it('should get weather closest to 1:00 PM for 2017-04-25 using fallbackSelector', function () {
      var time = moment.utc('2017-04-25');
      time.set('hours', 13);
      time.set('minutes', 0);

      return lib().getWeather(LOCATION)
        .then(function(weather) {
          return weather.getForecastForTime(time);
        })
        .then(function (forecast) {
          expect(forecast).to.be.an('object');
          expect(forecast.from).to.equal('2017-04-25T12:00:00Z');
        });
    });
  });
});
