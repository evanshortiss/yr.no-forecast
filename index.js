'use strict';

const log = require('debug')(require('./package.json').name);
const yrno = require('yr.no-interface');
const moment = require('moment');
const XML = require('pixl-xml');
const VError = require('verror');
const filter = require('lodash.filter');
const each = require('lodash.foreach');
const Promise = require('bluebird');

module.exports = (config) => {
  // Make a default config, but extend it with the passed config
  config = Object.assign({version: 1.9}, config);

  return {
    /**
     * Public call to get a LocationForecast instance.
     * Version is optional.
     * @param {Object}    params
     * @param {String}    [version]
     */

    getWeather: (params, version) => {
      version = version || config.version;

      log('requesting a locationforecast using API version %s', version);

      return Promise.fromCallback(function (callback) {
        // Make a standard call to the API
        yrno.locationforecast(params, version, function(err, body) {
          if (err) {
            log('failed to get locationforecast from yr.no API. Error:', err);
            return callback(err, null);
          }


          log('successfully retrieved locationforecast report from yr.no');

          // Wrap the response from API
          callback(null, new LocationForecast(body));
        });
      });
    }

  };
};

/**
 * @constructor
 * @param {String} xml
 */
function LocationForecast(xml) {
  this.xml = xml;
  this.basic = [];
  this.detail = [];

  log('building LocationForecast object by parsing xml to JSON');

  var startDt = Date.now();

  // Parse to JSON and return this object on success
  try {
    this.json = XML.parse(xml, {preserveDocumentNode: true});
    log('parsing xml to json took %dms', Date.now() - startDt);
  } catch (e) {
    throw new VError(e, 'failed to parse returned xml string to JSON');
  }

  this._init();

  log('LocationForecast init complete in %sms', Date.now() - startDt);

  return this;
}

LocationForecast.prototype = {
  _init: function () {
    var self = this;

    each(this.json.weatherdata.product.time, function (time) {
      if (time.location.symbol) {
        self.basic.push(time);
      } else {
        self.detail.push(time);
      }
    });
  },


  /**
   * Return JSON of weather
   */
  getJson: function() {
    return this.json;
  },


  /**
   * Return XML of weather
   */
  getXml: function() {
    return this.xml;
  },


  getFirstDateInPayload: function () {
    return this.json.weatherdata.product.time[0].from;
  },


  /**
   * Get five day weather.
   * @param {Function} callback
   */
  getFiveDaySummary: function() {
    log('getting five day summary');

    var firstDate = moment.utc(this.getFirstDateInPayload()).hours(12);

    return Promise.all([
      this.getForecastForTime(firstDate),
      this.getForecastForTime(firstDate.clone().add('days', 1)),
      this.getForecastForTime(firstDate.clone().add('days', 2)),
      this.getForecastForTime(firstDate.clone().add('days', 3)),
      this.getForecastForTime(firstDate.clone().add('days', 4))
    ])
      .then(function (results) {
        // Return a single array of objects
        return Array.prototype.concat.apply([], results);
      });
  },


  /**
   * Returns a forecast for a given time.
   * @param {String|Date} time
   * @param {Function}    callback
   */
  getForecastForTime: function(time) {
    var self = this;

    time = moment.utc(time);

    if (time.isValid() === false) {
      return Promise.reject(
        new Error('Invalid date provided for weather lookup')
      );
    }

    log('getting forecast for time %s', time);

    return Promise.resolve()
      .then(function () {
        return buildDetail(
          self.getDetailForTime(time),
          self.getBasicForTime(time)
        );
      });
  },

  /**
   * Get basic items for a time.
   * Find nearest hour on same day, or no result.
   * @param {String|Object}
   * @param {Function}
   */
  getBasicForTime: function (date) {
    date = moment.utc(date);

    log('getBasicForTime %s', date);

    // Used to find closest time to one provided
    var maxDifference = Infinity;
    var res = null;
    var items = getItemsForDay(this.basic, date);
    var len = items.length;
    var i = 0;

    while (i < len) {
      var to = moment.utc(items[i].to);
      var from = moment.utc(items[i].from);

      // Check the date falls in range
      if ((from.isSame(date) || from.isBefore(date)) && (to.isSame(date) || to.isAfter(date))) {
        var diff = Math.abs(to.diff(from));
        if (diff < maxDifference) {
          maxDifference = diff;
          res = items[i];
        }
      }

      i++;
    }

    return res || fallbackSelector(date, this.basic);
  },

  /**
   * Get detailed items for a time.
   * Find nearest hour on same day, or no result.
   * @param {String|Object}
   * @param {Function}
   */
  getDetailForTime: function (date) {
    date = moment.utc(date);

    log('getDetailForTime %s', date);

    // Used to find closest time to one provided
    var maxDifference = Infinity;
    var res = null;
    var itemsForDay = getItemsForDay(this.detail, date);
    var len = itemsForDay.length;
    var i = 0;

    while (i < len) {
      var diff = Math.abs(moment.utc(itemsForDay[i].to).diff(date));
      if (diff < maxDifference) {
        maxDifference = diff;
        res = itemsForDay[i];
      }

      i++;
    }

    return res || fallbackSelector(date, this.detail);
  }
};


/**
 * Build the detailed info for forecast object.
 * @param {Object} detail
 * @param {Object} obj
 */

function buildDetail(detail, basic) {
  // <location altitude="48" latitude="59.3758" longitude="10.7814">
  //   <temperature id="TTT" unit="celcius" value="6.3"/>
  //   <windDirection id="dd" deg="223.7" name="SW"/>
  //   <windSpeed id="ff" mps="4.2" beaufort="3" name="Lett bris"/>
  //   <humidity value="87.1" unit="percent"/>
  //   <pressure id="pr" unit="hPa" value="1010.5"/>
  //   <cloudiness id="NN" percent="0.0"/>
  //   <fog id="FOG" percent="0.0"/>
  //   <lowClouds id="LOW" percent="0.0"/>
  //   <mediumClouds id="MEDIUM" percent="0.0"/>
  //   <highClouds id="HIGH" percent="0.0"/>
  //   <dewpointTemperature id="TD" unit="celcius" value="4.2"/>
  // </location>

  var obj = {
    icon: basic.location.symbol.id,
    to: basic.to,
    from: basic.from,
    rain: basic.location.precipitation.value + ' ' + basic.location.precipitation.unit
  };

  // Corresponds to XML 'location' element
  var location = detail.location;
  var cur = null;
  for (var key in location) {
    cur = location[key];

    // Based on field type build the response
    // Type 1: Has "value" and "unit", combine for result
    // Type 2: Has only "percent"
    // Type 3: Has multiple properties where the name is the value
    if (cur.hasOwnProperty('value')) {
      obj[key] = cur.value + ' ' + cur.unit;
    } else if (cur.hasOwnProperty('percent')) {
      obj[key] = cur.percent + '%';
    } else if (typeof cur === 'object') {
      obj[key] = {};
      for (var nestedKey in cur) {
        if (nestedKey !== 'id') {
          obj[key][nestedKey] = cur[nestedKey];
        }
      }
    }
  }

  return obj;
}


/**
 * Used when no matching element is found for a time of a day.
 * @param   {Date}      time
 * @param   {Array}     collection
 */
function fallbackSelector(time, collection) {
  time = moment.utc(time);

  var isBefore = false;
  var len = collection.length;
  var i = 0;

  while (i < len) {
    if (time.isBefore(moment(collection[i].to))) {
      isBefore = true;
      i = len;
    }

    i++;
  }

  return isBefore ? collection[0] : collection[collection.length - 1];
}


/**
 * Provides detailed forecasts for a given date.
 * @param {Array}         collection
 * @param {String|Object} date
 */

function getItemsForDay(collection, date) {
  date = moment.utc(date);

  return filter(collection, function (item) {
    return (
      moment.utc(item.from).isSame(date, 'day') ||
      moment.utc(item.to).isSame(date, 'day')
    );
  });
}
