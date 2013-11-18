var assert = require('assert'),
  moment = require('moment'),
  lib = require('../index.js');

var LOCATIONS = {
  DUBLIN: {
    lat: 53.3478,
    lon: 6.2597
  },
  LA: {
    lat: 34.05,
    lon: 118.25
  },
  NICE: {
    lat: 43.6652,
    lon: 7.215
  },
  RYGGE: {
    lat: 59.375825399,
    lon: 10.7814121
  }
};

function checkSummary(weather) {
  // Simple check that fields exist
  assert(weather.hasOwnProperty('icon'));
  assert(weather.hasOwnProperty('temperature'));
  assert(weather.hasOwnProperty('rain'));
  return true;
}

describe('Test module', function() {
  this.timeout(10000);

  it('getWeather: Should return an object with LocationForecast methods', function(done) {
    lib.getWeather(LOCATIONS.DUBLIN, function(err, weather) {
      assert(!err);
      assert(weather);
      assert(weather.xml);
      assert(weather.json);
      done();
    });
  });


  it('getFiveDaySummary: Should return array with 5 weather objects', function(done) {
    lib.getWeather(LOCATIONS.DUBLIN, function(err, weather) {
      assert(!err);
      assert(weather);
      weather.getFiveDaySummary(function(err, summary) {
        assert(!err);
        assert(summary);
        assert(summary instanceof Array);
        done();
      });
    });
  });


  it('getFiveDaySummary: Should return array with 5 weather objects', function(done) {
    lib.getWeather(LOCATIONS.NICE, function(err, weather) {
      weather.getFiveDaySummary(function(err, summary) {
        assert(!err);
        assert(summary);
        assert(summary instanceof Array);
        done();
      });
    });
  });


  it('getFiveDaySummary: Should return array with 5 weather objects', function(done) {
    lib.getWeather(LOCATIONS.LA, function(err, weather) {
      weather.getFiveDaySummary(function(err, summary) {
        assert(!err);
        assert(summary);
        assert(summary instanceof Array);
        done();
      });
    });
  });


  it('getFiveDaySummary: Should return array with 5 weather objects', function(done) {
    lib.getWeather(LOCATIONS.RYGGE, function(err, weather) {
      weather.getFiveDaySummary(function(err, summary) {
        assert(!err);
        assert(summary);
        assert(summary instanceof Array);
        done();
      });
    });
  });


  it('getCurrentSummary: Should return an object with info fields', function(done) {
    lib.getWeather(LOCATIONS.DUBLIN, function(err, weather) {
      weather.getCurrentSummary(function(err, summary) {
        assert(!err);
        assert(summary);
        assert(checkSummary(summary));
        done();
      });
    });
  });


  it('getCurrentSummary: Should return an object with info fields', function(done) {
    lib.getWeather(LOCATIONS.LA, function(err, weather) {
      weather.getCurrentSummary(function(err, summary) {
        assert(!err);
        assert(summary);
        assert(checkSummary(summary));
        done();
      });
    });
  });


  it('getCurrentSummary: Should return an object with info fields', function(done) {
    lib.getWeather(LOCATIONS.NICE, function(err, weather) {
      weather.getCurrentSummary(function(err, summary) {
        assert(!err);
        assert(summary);
        assert(checkSummary(summary));
        done();
      });
    });
  });


  it('getCurrentSummary: Should return an object with info fields', function(done) {
    lib.getWeather(LOCATIONS.RYGGE, function(err, weather) {
      weather.getCurrentSummary(function(err, summary) {
        assert(!err);
        assert(summary);
        assert(checkSummary(summary));
        done();
      });
    });
  });
});


describe('Test retrieval for various times', function() {
  this.timeout(10000);

  it('Should get weather for earliest time possible today by requesting some time yesterday', function(done) {
    var time = moment();
    time.set('hours', (time.hours() - time.hours() - 4) );
    lib.getWeather(LOCATIONS.DUBLIN, function(err, weather) {
      assert(!err);
      assert(weather);
      weather.getForecastForTime(time, function(err, forecast) {
        assert(!err);
        assert(forecast);
        done();
      });
    });
  });

  it('Should get weather for 9:20 PM (21:20) tonight', function(done) {
    var time = moment();
    time.set('hours', 21);
    time.set('minutes', 20);
    lib.getWeather(LOCATIONS.DUBLIN, function(err, weather) {
      assert(!err);
      assert(weather);
      weather.getForecastForTime(time, function(err, forecast) {
        assert(!err);
        assert(forecast);
        done();
      });
    });
  });
})