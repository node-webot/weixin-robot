// Douban Event Api
var request = require('./request');
var data = require('../data');
var messages = data.messages;
var responses = data.responses;
var cities = data.cities;

var debug = require('debug');
var log = debug('wx:douban');
var error = debug('wx:douban:error');

Array.prototype.sample = function(size) {
  var arr = this;
  var shuffled = arr.slice(0), i = arr.length, min = i - size, temp, index;
  while (i-- > min) {
    index = Math.floor(i * Math.random());
    temp = shuffled[index];
    shuffled[index] = shuffled[i];
    shuffled[i] = temp;
  }
  return shuffled.slice(min);
};

module.exports = {
  'unknown': function(params, next) {
    var ret = messages['400'];
    var text = params['text'];
    if (text.length > 1 && text.length < 6) {
      ret = messages['CITY_404'];
    }
    if (text) {
      for (var i = responses.length - 1; i >= 0; i--) {
        var r = responses[i];
        if (text.search(r[0]) !== -1) {
          ret = r[1];
          break;
        }
      }
    }
    // 自动回复
    next(null, ret);
  },
  'events_list': function(params, next) {
    if (!params) return next(null, messages['400']);
    if (!params['loc'] && params['type']) return next(null, messages['CITY_FIRST']);
    if (params['type'] === 'UNKNOWN') return next(null, messages['TYPE_404']);

    request('GET https://api.douban.com/v2/event/list', params, function(err, ret) {
      if (err || !ret.events) return next(err, messages['503']);
      if (!ret.events.length) next(err, messages['404']);
      next(err, ret.events.sample(4));
    });
  },
  'nearby': function(params, next) {
    var cb = function() {
      if (!params.loc) return next(null, messages['GEO_404']);

      if (!('day_type' in params)) {
        // get today events first
        params.day_type = 'today';
        request('GET https://api.douban.com/v2/event/nearby', params, function(err, ret) {
          if (err || !ret.events) return next(err, messages['503']);
          if (ret.events.length > 1) return next(err, ret.events);
          if (params.day_type != 'future') {
            params.day_type = 'future';
            cb();
          }
          if (!ret.events.length) next(err, messages['GEO_404']);
          return next(err, ret.events);
        });
        return;
      }
      request('GET https://api.douban.com/v2/event/nearby', params, function(err, ret) {
        if (err || !ret.events) return next(err, messages['503']);
        if (!ret.events.length) next(err, messages['GEO_404']);
        next(err, ret.events);
      });
    };

    if (params.loc) return cb();

    // Find city id by latlng
    request('GET http://api.amap.com:9090/rgeocode/simple', {
      resType: 'json',
      encode: 'utf-8',
      range: 3000,
      roadnum: 3,
      crossnum: 2,
      poinum: 1,
      retvalue: 1,
      sid: 7001,
      region: [params.lng, params.lat].join(',')
    }, function(err, ret) {
      try {
        var loc_name = ret.list[0].city.name || ret.list[0].province.name;
        log('latlng to loc_name: ', loc_name);
        for (var i in cities) {
          var item = cities[i];
          if (loc_name.indexOf(item['name']) === 0) {
            params.loc = item['id'];
            break;
          }
        }
      } catch (e) {
        error('geo to loc failed', e);
      }
      cb();
    });
  }
};
