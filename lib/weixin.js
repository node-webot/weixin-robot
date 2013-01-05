var EMPTY_MESSAGE = '你的消息已经收到，若未即时回复，还望海涵';

var weixin = function(conf) {
  if (conf) {
    var k;
    for (k in conf) {
      this.conf[k] = conf[k];
    }
  }
};

weixin.makeMessage = function makeMsg(info) {
  var now = Math.ceil(new Date() / 1000, 10);
  var xml = '<xml><ToUserName><![CDATA[' + info.from + ']]></ToUserName>' +
  '<FromUserName><![CDATA[' + info.to + ']]></FromUserName>' +
  '<CreateTime>' + now + '</CreateTime>';

  if (info.items && info.items.length) {
    xml += '<MsgType><![CDATA[news]]></MsgType>' +
    '<Content><![CDATA[]]></Content>' +
    '<ArticleCount>' + info.items.length + '</ArticleCount>' +
    '<Articles>';
    info.items.forEach(function(item, i){
      xml += weixin.articleItem(item);
    });
    xml += '</Articles>';
  } else {
    xml += '<MsgType><![CDATA[text]]></MsgType>' +
    '<Content><![CDATA[' + (info.reply || weixin.conf['empty message'] || EMPTY_MESSAGE) + ']]></Content>';
  }

  var flag = 'flag' in info ? info.flag : 0;
  xml  += '<FuncFlag>' + flag + '</FuncFlag></xml>';
  return xml;
}
weixin.articleItem = function articleItem(item) {
  if (!item) return '';
  var tmaps = this.conf['article props'];
  if (tmaps) {
    var i,p;
    for (i in tmaps) {
      p = tmaps[i];
      if (typeof p == 'function') {
        item[i] = p(item);
      } else {
        item[i] = item[p];
      }
    }
  }
  return '<item><Title><![CDATA[' + item.title + ']]></Title>' +
  '<Discription><![CDATA[' + item.desc  + ']]></Discription>' +
  '<PicUrl><![CDATA[' + item.pic + ']]></PicUrl>' +
  '<Url><![CDATA[' + item.url + ']]></Url>' +
  '</item>';
};
weixin.set = function(p, v){
  this.conf[p] = v;
};
weixin.unset = function(p){
  delete this.conf[p];
};
weixin.conf = {};
weixin.waiter = require('./waiter');
weixin.router = require('./router');
weixin.robot = require('./robot');
weixin.parser = require('./parser');
weixin.geo2loc = weixin.parser.geo2loc;
weixin.dialogs = require('./dialog');
weixin.request = require('./request');

var middlewares = require('./middleware');
for (var k in middlewares) {
  weixin[k] = middlewares[k];
}
module.exports = weixin;
