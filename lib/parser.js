var data = require('../data');
var conf = require('../conf');
var debug = require('debug');
var log = debug('wx:parser');
var error = debug('wx:parser:error');
var request = require('./request');
var cities = data.cities;

Array.prototype.sample = function(size) {
  var arr = this;
  var shuffled = arr.slice(0), i = arr.length, min = Math.max(0, i - size), temp, index;
  while (i-- > min) {
    index = Math.round(i * Math.random());
    temp = shuffled[index];
    shuffled[index] = shuffled[i];
    shuffled[i] = temp;
  }
  return shuffled.slice(min);
};

function testContain(str, det) {
  if (str.search(det) !== -1) {
    return str.match(det)[0];
  }
  //det = det.split('|');
  //for (var i = 0, l = det.length; i < l; i++) {
    //if () {
      //return det[i];
    //}
  //}
}
function cleanMsg(msg, t) {
  return msg.replace(new RegExp(t, 'g'), '');
}
function listParam(text) {
  var ret = {};

  var text1 = text.replace(/\s+/, '');
  var msg = text1;

  for (var i = 0, l = cities.length; i < l; i++) {
    var item = cities[i];
    // message has city's Chinese name
    var t = testContain(msg, item['name']);
    if (t) {
      ret['loc'] = item['id'];
      msg = cleanMsg(msg, t);
      break;
    }
  }
  if (msg) {
    var date_types = data.date_types;
    for (var j in date_types) {
      var t = testContain(msg, date_types[j]);
      if (t) {
        ret['date_type'] = j;
        msg = cleanMsg(msg, t);
        break;
      }
    }
  }
  if (msg) {
    var types = data.types;
    for (var j in types) {
      var t = testContain(msg, types[j]);
      if (t) {
        ret['type'] = j;
        msg = cleanMsg(msg, t);
        break;
      }
    }
  }

  // 城市类型时间都处理完之后，还有剩余字符
  if (msg) {
    // 剩余字符被当做搜索关键字
    ret['q'] = msg == text1 ? text : msg;
  }

  return ret;
}
module.exports = {
  geo2loc: function(lnglat, cb) {
    // Get loc id by latlng
    request('GET http://restapi.amap.com/rgeocode/simple', {
      resType: 'json',
      encode: 'utf-8',
      range: 3000,
      roadnum: 0,
      crossnum: 0,
      poinum: 0,
      retvalue: 1,
      sid: 7001,
      key: conf.amap,
      region: [lnglat.lng, lnglat.lat].join(',')
    }, function(err, res) {
      if (err) {
        error('geo2loc failed', err);
        return cb();
      }
      try {
        var loc_name = res.list[0].city.name || res.list[0].province.name;
        log('latlng to loc_name: ', loc_name);
        for (var i = 0, l = cities.length; i < l; i++) {
          var item = cities[i];
          if (loc_name.indexOf(item['name'].split('|')[0]) === 0) {
            return cb(item['id']);
          }
        }
      } catch (e) {
        error('geo2loc failed', res);
      }
      return cb();
    });
  },
  listParam: listParam 
};
