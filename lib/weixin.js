var xml2json = require('xml2json');
var error = require('debug')('wx:weixin:error');

var weixin = function() {};

// accept a xml body string
weixin.parse = function(b) {
  var d;
  try {
    d = JSON.parse(xml2json.toJson(b)).xml;
  } catch (e) {
    error('parse xml body failed', e, b);
    return false;
  }
  var ret = {
    type: d.MsgType,
    text: d.Content,
    from: d.FromUserName,
    to: d.ToUserName,
  };
  var text = d.Content || '';
  // Remove head and tail blankspace first
  text = text.replace(/(^[\s]+|[\s]+$)/g, '');
  if (ret.type === 'location') {
    ret.param = weixin.parseLoc(d);
  }
  return ret;
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
  '<Description><![CDATA[' + item.owner.name + ' / ' +
  (item.participant_count + item.wisher_count) + '人关注 / ' + item.address + ']]></Description>' +
  '<PicUrl><![CDATA[' + item.image_lmobile + ']]></PicUrl>' +
  '<Url><![CDATA[' + item.adapt_url + ']]></Url>' +
  '</item>';
}
weixin.makeMsg = function makeMsg(info) {
  var now = parseInt(new Date() / 1000, 10) + 1;
  var xml = '<xml><ToUserName><![CDATA[' + info.from + ']]></ToUserName>' +
  '<FromUserName><![CDATA[' + info.to + ']]></FromUserName>' +
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
    '<Content><![CDATA[' + info.reply + ']]></Content>';
  }

  var flag = 'flag' in info ? info.flag : 0;
  xml  += '<FuncFlag>' + flag + '</FuncFlag></xml>';
  return xml;
}
module.exports = weixin;
