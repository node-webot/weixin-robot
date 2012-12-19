var xml2json = require('xml2json');
var error = require('debug')('weixin:error');

var request = require('./request');

// standarlize the latlng
function parseLoc(d) {
  var params = {};
  if ('Location_X' in d) {
    params.lat = d['Location_X'];
  }
  if ('Location_Y' in d) {
    params.lng = d['Location_Y'];
  }
  return Object.keys(params).length > 0 && params;
}
// Get loc info by latlng
function geo2loc(lnglat, cb) {
  request('GET http://restapi.amap.com/rgeocode/simple', {
    resType: 'json',
    encode: 'utf-8',
    range: 3000,
    roadnum: 0,
    crossnum: 0,
    poinum: 0,
    retvalue: 1,
    sid: 7001,
    region: [lnglat.lng, lnglat.lat].join(',')
  }, function(err, res) {
    if (err) {
      error('geo2loc failed', err);
      return cb();
    }
    var r, loc_name;
    try {
      r = res.list[0];
      loc_name = r.city && r.city.name || r.province.name;
    } catch (e) {
      error('geo2loc failed', res);
      return cb();
    }
    return cb({
      city: loc_name,
      place: r
    });
  });
};
// accept a xml body string
function parser(b, opts) {
  opts = opts || {};

  var d;
  try {
    d = JSON.parse(xml2json.toJson(b)).xml;
  } catch (e) {
    error('parse xml body failed', e, b);
    return false;
  }
  var text = String(d.Content || '');
  // Remove head and tail blankspace first
  if (!opts.keepBlank) text = text.trim();
  var ret = {
    type: d.MsgType,
    text: text,
    _text: d.Content,
    from: d.FromUserName,
    to: d.ToUserName,
  };
  if (ret.type === 'location') {
    ret.param = parseLoc(d);
  }
  if (ret.type === 'image') {
    ret.param = {
      picUrl: d.PicUrl
    };
  }
  return ret;
};
parser.parseLoc = parseLoc;
parser.geo2loc = geo2loc;
parser.xml2json = xml2json.toJson;

module.exports = parser;
