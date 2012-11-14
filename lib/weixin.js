var xml2json = require('xml2json');
var error = require('debug')('wx:weixin:error');

var weixin = function() {};

var data = require('../data');
var cities = data.cities;

// 记住用户之前的城市
var user_cities = {};

// accept a xml body string
weixin.parse = function(b) {
  var d;
  try {
    d = JSON.parse(xml2json.toJson(b)).xml;
  } catch (e) {
    error('parse request failed', e, b);
    return false;
  }
  var ret = {
    receiver: d.FromUserName,
    sender: d.ToUserName,
  }
  var text = d.Content || '';
  text = text.replace(/(^[\s]+|[\s]+$)/g, '');
  if (d.MsgType == 'text') {
    var param =  weixin.parseText(text);
    if (param) {
      ret.act = 'events_list';
      if (param.loc) {
        user_cities[ret.receiver] = param.loc
      } else {
        param.loc = user_cities[ret.receiver];
      }
    } else {
      ret.act = 'unknown';
      ret.flag = 1;
      param = {
        text: text
      };
    }
    // get more for all types
    param.count = (param.type && param.type !== 'all') ? 12 : 20;
    ret.param = param;
    return ret;
  } else if (d.MsgType == 'location') {
    ret.act = 'nearby';

    var param = weixin.parseLoc(d);
    param.count = 5;
    ret.param = param;
    return ret;
  } else {
    error('unknown message type', d);
  }
};

function testContain(str, det) {
  det = det.split('|');
  for (var i = 0, l = det.length; i < l; i++) {
    if (str.indexOf(det[i]) != -1) {
      return det[i];
    }
  }
}
function cleanMsg(msg, t) {
  return msg.replace(new RegExp(t, 'g'), '');
}

weixin.parseText = function(text) {
  var params = {};

  var msg = text.replace(/\s+/, '');

  for (var i in cities) {
    var item = cities[i];
    // message has city's Chinese name
    var t = testContain(msg, item['name']);
    if (t) {
      params['loc'] = item['id'];
      msg = cleanMsg(msg, t);
      break;
    }
  }

  if (msg) {
    var date_types = data.date_types;
    for (var j in date_types) {
      var t = testContain(msg, date_types[j]);
      if (t) {
        params['date_type'] = j;
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
        params['type'] = j;
        msg = cleanMsg(msg, t);
        break;
      }
    }
  }

  if (params['loc'] && msg) {
    params['type'] = params['type'] || 'UNKNOWN';
  }

  return Object.keys(params).length > 0 && params;
};
weixin.parseLoc = function(d) {
  var params = {};
  if ('Location_X' in d) {
    params.lat = d['Location_X'];
  }
  if ('Location_Y' in d) {
    params.lng = d['Location_Y'];
  }
  return Object.keys(params).length > 0 && params;
};

function eventItem(item) {
  return '<item><Title><![CDATA[' + item.title + ']]></Title>' +
  '<Discription><![CDATA[' + item.owner.name + ' / ' +
  (item.participant_count + item.wisher_count) + '人关注 / ' + item.address + ']]></Discription>' +
  '<PicUrl><![CDATA[' + item.image_lmobile + ']]></PicUrl>' +
  '<Url><![CDATA[' + item.adapt_url + ']]></Url>' +
  '</item>';
}
weixin.makeMsg = function makeMsg(info) {
  var now = parseInt(new Date() / 1000, 10);
  var xml = '<xml><ToUserName><![CDATA[' + info.receiver + ']]></ToUserName>' +
  '<FromUserName><![CDATA[' + info.sender + ']]></FromUserName>' +
  '<CreateTime>' + now + '</CreateTime>';

  if (info.items) {
    xml += '<MsgType><![CDATA[news]]></MsgType>' +
    '<Content><![CDATA[]]></Content>' +
    '<ArticleCount>' + info.items.length + '</ArticleCount>' +
    '<Articles>';
    info.items.forEach(function(item, i){
      xml += eventItem(item);
    });
    xml += '</Articles>';
  } else {
    xml += '<MsgType><![CDATA[text]]></MsgType>' +
    '<Content><![CDATA[' + info.content + ']]></Content>';
  }

  var flag = 'flag' in info ? info.flag : 0;
  xml  += '<FuncFlag>' + flag + '</FuncFlag></xml>';
  return xml;
}
module.exports = weixin;
