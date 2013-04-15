"use strict";

var debug = require('debug');
var log = debug('webot:info:log');
var verbose = debug('webot:info:verbose');
var warn = debug('webot:info:warn');
var error = debug('webot:info:error');

var _ = require('underscore')._;

/**
 * @class Info
 *
 * 微信消息
 *
 * 负责解析微信发来的消息,以及打包回复消息.
 *
 * 参见[官方文档](http://mp.weixin.qq.com/cgi-bin/readtemplate?t=wxm-callbackapi-doc)
 */

/**
 * @constructor 解析微信消息
 * @param {Object}  json    原始XML消息解析后的JSON
 */
function Info(json){
  if (json instanceof Info) return json;
  if (!(this instanceof Info)) return new Info(json);

  for (var i in json) {
    this[i] = Array.isArray(json[i]) ? json[i][0] : String(json[i]);
  }

  this.CreateTime = Number(this.CreateTime);

  // shorthands
  var map = {
      user: 'FromUserName'
    , from: 'FromUserName'
    , sp: 'ToUserName'
    , createTime: 'CreateTime'
    , type: 'MsgType'
    , text: 'Content'
    , lat: 'Location_X'
    , lng: 'Location_Y'
    , scale: 'Scale'
    , zoom: 'Zoom'
    , label: 'Label'
    , pic: 'PicUrl'
    , event: 'Event'
    , eventKey: 'EventKey'
  }

  var self = this
  for (var i in map) {
    (function(i) {
      self.__defineGetter__(i, function() {
        return self[map[i]];
      })
    })(i);
  }

  log('info: %j', this);

}

/**
 * @property {Webot}
 */
Info.prototype.webot = null;

/**
 * @property {Object}
 */
Info.prototype.session = null;

/**
 * @property {Object} 解析后的原始JSON
 */
Info.prototype.originJSON = null;

/**
 * @property {XMLElement} 原始XML
 */
Info.prototype.originXML = null;

/**
 * @property {Boolean}
 */
Info.prototype.flag = 0;

/**
* @method wait 标记消息为需要等待操作
*/
Info.prototype.wait = function(rule) {
  return this.webot.wait(this.user, rule);
};
Info.prototype.rewait = function(rule) {
  return this.webot.rewait(this.user, rule);
};

/**
* @method data 为用户存储数据，优先调用绑定的 session
*/
Info.prototype.data = function(key, val) {
  var args = [].slice.call(arguments);

  args.unshift(this.session || this.user);

  var webot = this.webot;
  var ret = webot.data.apply(webot, args);
  if (ret === webot) return this;
  return ret;
};

/**
 * @method toXML 把回复消息打包成XML
 * @param {Object} mapping 图文消息的映射关系,参见{@link WeBot#config}
 * @return {XMLElement} 要回复的消息,XML格式
 */
Info.prototype.toXML = function(mapping){
  return Info.pack(this, mapping);
};

/**
 * @method isText 用户发来的是文本消息
 */
Info.prototype.isText = function(){
  return this.type == 'text';
};

/**
 * @method isLocation 用户发来的是地理位置消息
 */
Info.prototype.isLocation = function(){
  return this.type === 'location';
};

/**
 * @method isImage 用户发来的是图文消息
 */
Info.prototype.isImage = function(){
  return this.type === 'image';
};

/**
 * @method isImage 用户发来的是连接消息
 */
Info.prototype.isLink = function(){
  return this.type === 'link';
};

/**
 * @method isEvent 用户发来的是事件消息
 */
Info.prototype.isEvent = function(){
  return this.type === 'event';
};

Info.is = function(info){
  return info instanceof Info;
};

/**
 * @method pack 把回复消息打包成XML.
 * @param {Info} info Info对象,用户需要先设置reply和flag(后者可选);
 * @param {Object/Function} mapping 图文消息的映射关系,参见{@link WeBot#config}
 * @return {XMLElement}
 * @static
 */
Info.pack = function(info, mapping){
  var data = _.clone(info);
  var reply = data.reply;

  //log('packing reply: ', reply);

  // 具备图文消息的特征
  if (_.isObject(reply) && !_.isArray(reply) && !reply.type) {
    reply = data.reply = [reply];
  }
  if (_.isArray(reply)) {
    if (_.isFunction(mapping)) {
      reply = reply.map(function(item, i) {
        return mapping.call(reply, item, i, info);
      });
    } else if (mapping) {
      reply.forEach(function(item, index){
        item['title'] = item[ mapping['title'] || 'title'];
        item['description'] = item[ mapping['description'] || 'description'];
        item['pic'] = item[ mapping['picUrl'] || 'picUrl'] || item[ mapping['pic'] || 'pic'];
        item['url'] = item[ mapping['url'] || 'url'];
      });
    }
  }
  data.reply = reply;

  var xml = _.template(Info.TEMPLATE_REPLY)(data);

  return xml;
};

/**
 * @property {String} TEMPLATE_REPLY 回复消息的XML模版
 * @static
 */
Info.TEMPLATE_REPLY = [
  '<xml>',
    '<ToUserName><![CDATA[<%=user%>]]></ToUserName>',
    '<FromUserName><![CDATA[<%=sp%>]]></FromUserName>',
    '<CreateTime><%=(new Date().getTime())%></CreateTime>',
    '<FuncFlag><%=flag ? 1 : 0%></FuncFlag>',
    '<% if(Array.isArray(reply)){ %>',
      '<MsgType><![CDATA[news]]></MsgType>',
      '<ArticleCount><%=reply.length%></ArticleCount>',
      '<Articles>',
        '<% _.each(reply, function(item){ %>',
          '<item>',
            '<Title><![CDATA[<%=item.title%>]]></Title>',
            '<Description><![CDATA[<%=item.description%>]]></Description>',
            '<PicUrl><![CDATA[<%=item.pic%>]]></PicUrl>',
            '<Url><![CDATA[<%=item.url%>]]></Url>',
          '</item>',
        '<% }); %>',
      '</Articles>',
    '<% } else if (reply.type === "music") { %>',
      '<MsgType><![CDATA[music]]></MsgType>',
      '<MusicUrl><![CDATA[<%=reply.MusicUrl || reply.url%>]]></MusicUrl>',
      '<HQMusicUrl><![CDATA[<%=reply.HQMusicUrl || reply.hq_url%>]]></HQMusicUrl>',
    '<% } else { %>',
      '<MsgType><![CDATA[text]]></MsgType>',
      '<Content><![CDATA[<%=String(reply)%>]]></Content>',
    '<% }%>',
  '</xml>'
].join('');

module.exports = exports = Info;
