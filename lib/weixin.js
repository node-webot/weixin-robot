var xml2json = require('xml2json');
var error = require('debug')('wx:weixin:error');

var weixin = function() {};

var data = require('./data');
var cities = data.cities;

// 记住用户之前的城市
var user_cities = {};

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
  if (d.MsgType == 'text') {
    var param =  weixin.parseText(d.Content);
    if (param) {
      ret.act = 'events_list';
    } else {
      ret.act = 'unknown';
      ret.content = '同城君只是个小机器人，还不太懂你说的是什么意思诶。我会努力学习，说不定将来就能回答你了哦！'
      param = {};
    }
    if (param.loc) {
      user_cities[ret.receiver] = param.loc
    } else {
      param.loc = user_cities[ret.receiver] || 'china';
    }
    param.count = 20;
    ret.param = param;
    return ret;
  } else if (d.MsgType == 'location') {
    ret.act = 'nearby';

    var param = weixin.parseLoc(d);
    param.count = 3;
    ret.param = param;
    return ret;
  } else {
    error('unknown message type', d);
  }
};
weixin.parseText = function(msg) {
  var params = {};

  for (var i in cities) {
    var item = cities[i];
    // message starts with a city's Chinese name
    if (msg.indexOf(item['name']) === 0) {
      params['loc'] = item['id'];
      var type_str = msg.replace(item['name'], '').replace('活动', '').replace(/\s+/g, '');
      var types = data.types;
      for (var j in types) {
        // fuzzy match for event type
        if (type_str.indexOf(types[j]) != -1) {
          params['type'] = j;
          break;
        }
      }
      break;
    }
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

  var flag = 0;
  if (info.act === 'nearby') {
    info.items = info.douban_ret.events.slice(0, 3);
  } else if (info.act === 'events_list') {
    info.items = info.douban_ret.events.sample(4);
  } else {
    flag = 1;
  }

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

  xml  += '<FuncFlag>' + flag + '</FuncFlag></xml>';
  return xml;
}
module.exports = weixin;
