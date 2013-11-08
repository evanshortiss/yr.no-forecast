module.exports = {
  getWeather: getWeather
};

var yrno = require('yr.no-interface'),
  moment = require('moment'),
  async = require('async'),
  xml2js = require('xml2js');

/**
 * Public call to easily get weather object.
 * @param {Object}    params
 * @param {Callback}  callback
 * @param {String}    version
 */

function getWeather(params, callback, version) {
  // Make a standard call to the API
  yrno.locationforecast(params, function(err, body) {
    if (err) {
      return callback(err, null);
    }

    // Wrap the response from API
    new LocationForecast(body, callback);
  }, version);
}


function LocationForecast(xml, callback) {
  this.xml = xml;
  this.hourlies = [];
  this.summaries = [];

  // Parse to JSON and return this object on success
  var self = this;
  new xml2js.Parser({
    async: true,
    mergeAttrs: true,
    explicitArray: false
  }).parseString(xml, function(err, json) {
    if (err) {
      return callback('Failed to parse yr.no xml to json', null);
    }
    self.json = json;
    self._init(callback);
  });
}

LocationForecast.prototype = {
  _init: function(callback) {
    var self = this;

    var json = this.json;
    var current = json['weatherdata']['product']['time'][0];
    current.symbol = json['weatherdata']['product']['time'][1]['symbol'];

    async.forEach(json['weatherdata']['product']['time'], function(time, cb) {
      // Forecast data with a symbol is a basic summary
      if (time['location']['symbol']) {
        self.summaries.push(time);
      } else {
        self.hourlies.push(time);
      }
      cb();
    }, function() {
      return callback(null, self);
    });
  },

  getJson: function() {
    return this.json;
  },

  getXml: function() {
    return this.xml;
  },

  /**
   * Search for a matching hourly/summary.
   * @param {Array}     collection    Summary or Hourly
   * @param {Mixed}     time          String or Date object
   * @param {Function}  closestMatch  Find the cloest time.
   * @param {Function}  callback
   */
  _getForTime: function(collection, time, closestMatch, callback) {
    // Convert time to moment object at UTC
    time = moment.utc(time);

    // Storage for returned val
    var nearestSummary = null;

    if (!callback) {
      callback = closestMatch;
      closestMatch = false;
    }

    // Loop over summaries and find one for time specified
    async.forEach(collection, function(curSummary, cb) {
      var from = moment(curSummary.from),
        to = moment(curSummary.to);

      // Check is time in between summaries
      if ((from.isBefore(time) || from.isSame(time)) && (to.isAfter(time) || to.isSame(time))) {
        // Close enough, return it.
        if (!closestMatch) {
          return cb(curSummary);
        }
        // See is this summary a smaller time range than previous, if so use it.
        else if (nearestSummary && closestMatch) {
          var nearestRange = Math.abs(moment(nearestSummary.to).diff(moment(nearestSummary.from)));
          var curRange = Math.abs(moment(curSummary.to).diff(moment(curSummary.from)))
          if (nearestRange > curRange) {
            nearestSummary = curRange
          }
        } else {
          nearestSummary = curSummary;
        }
      }

      cb();
    }, function(summary) {
      if (summary) {
        return callback(null, summary);
      }

      return callback(null, nearestSummary);
    });
  },


  /**
   * Get a summary for a specific time.
   * @param {Mixed}     time
   * @param {Boolean}   [closestMatch]
   * @param {Function}  callback
   */
  getSummaryForTime: function(time, closestMatch, callback) {
    this._getForTime(this.summaries, time, closestMatch, callback);
  },


  /**
   * Get a hourly for a specific time.
   * @param {Mixed}     time
   * @param {Boolean}   [closestMatch]
   * @param {Function}  callback
   */
  getHourlyForTime: function(time, closestMatch, callback) {
    var self = this;

    // Round to nearest hour
    var t = time.clone();
    t.endOf('hour');
    t.milliseconds(t.milliseconds() + 1);

    // Control how many lookups are done before giving up
    var hoursAdded = 0;

    this._getForTime(this.hourlies, t, closestMatch, function(err, hourly) {
      if(err) {
        return callback(err);
      }

      // Go again but add on an hour...
      if(!hourly && hoursAdded<6) {
        hoursAdded++;
        t.add('hour', hoursAdded);
        self.getHourlyForTime(t, closestMatch, callback);
      } else {
        return callback(null, hourly);
      }
    });
  },


  /**
   * Get basic summary for current time.
   * @param {Function} callback
   */
  getCurrentSummary: function(callback) {
    this.getForecastForTime(Date.now(), callback);
  },


  /**
   * Get the forecast for next five days.
   * @params {Function} callback
   */
  getFiveDaySummary: function(callback) {
    var self = this;
    var fns = [];
    // Use miday for forecast
    var curDate = moment.utc();

    // Create 5 days of dates
    for (var i = 0; i < 5; i++) {
      // Avoid scope error for wrong day reference
      (function() {
        var day = curDate.clone();
        day = day.add('days', i);
        fns.push(function(cb) {
          self.getForecastForTime(day, function(err, weather) {
            if (err) {
              return cb(err, null);
            }

            return cb(null, weather);
          })
        });
      })()

    }

    // Run tasks and return weather array
    async.series(fns, function(err, res) {
      if (err) {
        return callback(err, null);
      }

      return callback(null, res);
    });
  },


  /**
   * Get a forecast conditions for a time specified.
   * @params {Mixed}    time
   * @params {Function} callback
   */
  getForecastForTime: function(time, callback) {
    var self = this;

    time = moment.utc(time);
    time.minutes(time.zone());
    if (time.isValid() === false) {
      return callback({
        msg: 'Invalid date provided for weather lookup. Date: ' + time.toString()
      });
    }

    this.getSummaryForTime(time, true, function(err, summary) {
      if (!summary) {
        return callback('No weather summary for time ' + time.toJSON(), null);
      }

      var res = {
        icon: summary['location']['symbol']['id'],
        to: summary['to'],
        from: summary['from'],
        rain: (summary['location']['precipitation']['value'] + ' ' + summary['location']['precipitation']['unit'])
      };

      self.getHourlyForTime(time, true, function(err, hourly) {
        if (hourly) {
          // Build response
          res.temperature = hourly['location']['temperature']['value'];
          res.windSpeed = hourly['location']['windSpeed']['mps'] + 'm/s';
          res.windBearing = hourly['location']['windDirection']['deg'];
          res.beaufort = hourly['location']['windSpeed']['beaufort'];
          res.cloudCover = hourly['location']['cloudiness']['percent'];
          res.humidity = hourly['location']['humidity']['value'] + '%';
          res.pressure = hourly['location']['pressure']['value'] + ' ' + hourly['location']['pressure']['unit'];
        }

        return callback(null, res);
      });
    });
  }
};