'use strict';

var moment = require('moment');
var proxyquire = require('proxyquire');
var sinon = require('sinon');
var chai = require('chai');
var readFileSync = require('fs').readFileSync;
var join = require('path').join;
var uncached = require('require-uncached');

chai.use(require('chai-truthy'));
var expect = require('chai').expect;

var SAMPLE_XML = readFileSync(
  join(__dirname, '../fixtures/weather-response-oslo.xml'), 'utf8'
);


var LOCATION = {
  lat: 53.3478,
  lon: 6.2597
};

describe('yr.no-forecast', function() {
  this.timeout(5000);

  var lib, stubs;

  var YRNO = 'yr.no-interface';

  beforeEach(function () {
    stubs = {
      [YRNO]: {
        locationforecast: sinon.stub().yields(null, SAMPLE_XML)
      }
    };

    lib = proxyquire('../index.js', stubs);
  });

  describe('#getWeather', function () {
    it('should return an error for malformed xml payloads', function () {
      stubs[YRNO].locationforecast.yields(null, '<xml><invalid </invalid></xml>');

      return lib().getWeather(LOCATION)
        .then(() => {
          throw new Error('not meant to be here');
        })
        .catch(function (err) {
          expect(err).to.be.truthy();
          expect(err.toString()).to.contain('Parse Error: Mismatched closing tag');

          expect(
            stubs[YRNO].locationforecast.getCall(0).args[1]
          ).to.equal(1.9);
          expect(
            stubs[YRNO].locationforecast.getCall(0).args[0]
          ).to.equal(LOCATION);
        });
    });

    it('should return an error on yr.no API errors', function () {
      stubs[YRNO].locationforecast.yields(new Error('oh noes!'));

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
            stubs[YRNO].locationforecast.getCall(0).args[1]
          ).to.equal(version);
        });
    });

    it('should use custom version from args to getWeather', () => {
      const version = 2.1;

      return lib().getWeather(LOCATION, version)
        .then(function() {
          expect(
            stubs[YRNO].locationforecast.getCall(0).args[1]
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
            expect(cur.temperature).to.be.a('string');
            expect(cur.windDirection).to.be.an('object');
            expect(cur.windSpeed).to.be.an('object');
            expect(cur.humidity).to.be.a('string');
            expect(cur.pressure).to.be.a('string');
            expect(cur.cloudiness).to.be.a('string');
            expect(cur.lowClouds).to.be.a('string');
            expect(cur.mediumClouds).to.be.a('string');
            expect(cur.highClouds).to.be.a('string');
            expect(cur.temperatureProbability).to.be.a('string');
            expect(cur.windProbability).to.be.a('string');
            expect(cur.dewpointTemperature).to.be.a('string');
          });

          expect(summary).to.deep.equal(uncached('fixtures/five-day-oslo'));
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

    it('should return the easliest possible weather for a given date', function () {
      return lib().getWeather(LOCATION)
        .then(function(weather) {
          expect(weather).to.be.an('object');

          return weather.getForecastForTime(moment('2017-04-15'));
        })
        .then(function (forecast) {
          expect(forecast).to.be.an('object');
          expect(forecast.from).to.equal('2017-04-18T02:00:00Z');
        });
    });

    it('should get weather for earliest time possible today by requesting some time yesterday', function() {
      var time = moment('2017-04-18');
      time.set('hours', time.hours() - time.hours() - 4);

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
          expect(forecast.temperature).to.be.a('string');
          expect(forecast.windDirection).to.be.an('object');
          expect(forecast.windSpeed).to.be.an('object');
          expect(forecast.windGust).to.be.an('object');
          expect(forecast.humidity).to.be.a('string');
          expect(forecast.pressure).to.be.a('string');
          expect(forecast.cloudiness).to.be.a('string');
          expect(forecast.fog).to.be.a('string');
          expect(forecast.lowClouds).to.be.a('string');
          expect(forecast.mediumClouds).to.be.a('string');
          expect(forecast.highClouds).to.be.a('string');
          expect(forecast.dewpointTemperature).to.be.a('string');
        });
    });

    it('should get weather for latest time possible today by requesting some time yesterday', function() {
      var time = moment('2017-04-28');
      time.set('hours', time.hours() - time.hours() - 4);

      return lib().getWeather(LOCATION)
        .then(function(weather) {
          return weather.getForecastForTime(time);
        })
        .then(function (forecast) {
          expect(forecast.icon).to.be.a('string');
          expect(forecast.to).to.be.a('string');
          expect(forecast.from).to.be.a('string');
          expect(forecast.rain).to.be.a('string');
          expect(forecast.temperature).to.be.a('string');
          expect(forecast.windDirection).to.be.an('object');
          expect(forecast.windSpeed).to.be.an('object');
          expect(forecast.humidity).to.be.a('string');
          expect(forecast.pressure).to.be.a('string');
          expect(forecast.lowClouds).to.be.a('string');
          expect(forecast.mediumClouds).to.be.a('string');
          expect(forecast.highClouds).to.be.a('string');
          expect(forecast.dewpointTemperature).to.be.a('string');
        });
    });

    it('should get weather for 9:20 PM (21:20) tonight', function() {
      var time = moment('2017-04-18');
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
          expect(forecast.temperature).to.be.a('string');
          expect(forecast.windDirection).to.be.an('object');
          expect(forecast.windSpeed).to.be.an('object');
          expect(forecast.windGust).to.be.an('object');
          expect(forecast.humidity).to.be.a('string');
          expect(forecast.pressure).to.be.a('string');
          expect(forecast.cloudiness).to.be.a('string');
          expect(forecast.fog).to.be.a('string');
          expect(forecast.lowClouds).to.be.a('string');
          expect(forecast.mediumClouds).to.be.a('string');
          expect(forecast.highClouds).to.be.a('string');
          expect(forecast.dewpointTemperature).to.be.a('string');
        });
    });
  });
});
