var xml2js = require('xml2js');
var xmlParser = new xml2js.Parser();

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
function parser(xml, opts, cb){
  opts = opts || {};

  xmlParser.parseString(xml, function(err, result) {
    if (err || !result || !result.xml) {
      error('parse xml body failed', err, result);
      return cb(err, null);
    }

    var d = result.xml;
    // the no will be parsed as false, which is not good
    if (d.Content === false) d.Content = 'no';

    var text = String(d.Content || '');
    // Remove head and tail blankspace first
    if (!opts.keepBlank) text = text.trim();
    var ret = {
      type: d.MsgType.toString(),
      text: text,
      _text: d.Content.toString(),
      from: d.FromUserName.toString(),
      to: d.ToUserName.toString(),
    };
    if (ret.type === 'location') {
      ret.param = parseLoc(d);
    }
    if (ret.type === 'image') {
      ret.param = {
        picUrl: d.PicUrl
      };
    }
    cb(null,ret)
  });
}

parser.parseLoc = parseLoc;
parser.geo2loc = geo2loc;

module.exports = parser;
