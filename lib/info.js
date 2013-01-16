"use strict";

var debug = require('debug');
var log = debug('webot:info:log');
var warn = debug('webot:info:warn');
var error = debug('webot:info:error');

var _ = require('underscore')._

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
function Info(json,cfg){
  this.user = String(json.FromUserName);
  this.sp = String(json.ToUserName);    
  this.createTime = Number(json.CreateTime);
  this.type = String(json.MsgType);  
  this.text = json.Content && String(json.Content);  
  this.lat = json.Location_X && String(json.Location_X);  
  this.lng = json.Location_Y && String(json.Location_Y);  
  this.scale = json.Scale && String(json.Scale);    
  this.label = json.Label && String(json.Label);      
  this.pic = json.PicUrl && String(json.PicUrl);

  _.extend(this.config, cfg);
  if(!this.config.keepBlank && info.text){
    this.text = this.text.trim();
  }

  log('info: %j', this)
}

/**
 * @property {String} 类标识
 * @readonly
 */
Info.prototype.xtype = 'Info';

/**
 * @property {Object} config 配置选项
 * - keepBlank {String} 是否保留文本消息的前后空格
 * - mapping {Object} 图文列表的属性对应关系,
 *   有时候action返回的info.reply列表,里面的对象并不使用标准键值,然后又不想自己用map处理
 * 
 *   - title : 图文标题
 *   - description : 图文描述
 *   - pic : 图片地址
 *   - url : 原文地址
 */
Info.prototype.config = {
  keepBlank: true,
  mapping:{
    'title': 'title',
    'description': 'description',
    'pic': 'pic',
    'url': 'url'
  }
};

//=====原始消息属性=====
/**
 * @cfg {String} 消息类型:
 *
 * - text: 文本消息
 * - location: 位置消息
 * - image: 图片消息
 */
Info.prototype.type = 'text';

/**
 * @cfg {String} 普通用户的微信号
 * 对应于原始字段: FromUserName
 */
Info.prototype.user = null;

/**
 * @cfg {String} 公众帐号的微信号
 * 对应于原始字段: ToUserName
 */
Info.prototype.sp = null;

/**
 * @cfg {Number} 消息接收时间,timestamp格式
 * 对应于原始字段: CreateTime
 */
Info.prototype.createTime = null;

/**
 * @cfg {String} 消息内容
 * 对应于原始字段: Content
 */
Info.prototype.text = null;

/**
 * @cfg {String} 纬度
 * 对应于原始字段: Location_X
 */
Info.prototype.lat = null;

/**
 * @cfg {String} 经度
 * 对应于原始字段: Location_Y
 */
Info.prototype.lng = null;

/**
 * @cfg {String} 地图缩放大小
 * 对应于原始字段: Scale
 */
Info.prototype.scale = null;

/**
 * @cfg {String} 地理位置信息
 * 对应于原始字段: Label
 */
Info.prototype.label = null;

/**
 * @cfg {String} 图片URL,需通过HTTP GET获取
 * 对应于原始字段: PicUrl
 */
Info.prototype.pic = null;

/**
 * @cfg {Object} 解析后的原始JSON
 */
Info.prototype.originJSON = null;

/**
 * @cfg {XMLElement} 原始XML
 */
Info.prototype.originXML = null;


//=====回复消息属性=====
/**
 * @property {String/Array} reply 回复消息
 * 
 * 支持格式(2选1):
 * 
 * - {String} 回复文字消息,大小限制在2048字节
 * - {Array}  回复多条图文消息信息. 默认第一个item为大图,限制为10条以内.
 * 
 *   - {String} title 图文消息标题
 *   - {String} description 图文消息描述
 *   - {String} pic 图片链接,支持JPG、PNG格式,较好的效果为大图(640x320),小图(80x80),限制图片链接的域名需要与开发者填写的基本资料中的Url一致
 *   - {String} url 点击图文消息跳转链接
 *
 *   注: 提供了映射功能,参见 {@link #config}
 */
Info.prototype.reply = null;

/**
 * @property {Number} 回复消息用的属性,对消息进行星标
 * 
 * - 星标: 1
 * - 不星标: 0
 */
Info.prototype.flag = 0;

/**
 * @method toXML 把回复消息打包成XML  
 * @return {XMLElement} 要回复的消息,XML格式
 */
Info.prototype.toXML = function(){
  return Info.pack(this)
}

/**
 * @method isText 用户发来的是文本消息
 */
Info.prototype.isText = function(){
  return this.type == 'text'
}

/**
 * @method isLocation 用户发来的是地理位置消息
 */
Info.prototype.isLocation = function(){
  return this.type == 'location'
}
/**
 * @method isImage 用户发来的是图文消息
 */
Info.prototype.isImage = function(){
  return this.type == 'image'
}

/**
 * @method is 判断是否是消息对象
 * @static
 */
Info.is = function(info){
  return info && info.xtype === 'Info'
}

/**
 * @method pack 把回复消息打包成XML.
 * @param {Info} info Info对象,用户需要先设置reply和flag(可选)
 * @return {XMLElement}
 * @static
 */
Info.pack = function(info){
  var xml = _.template(Info.TEMPLATE_REPLY)(info);
  return xml;
}

/**
 * @property {String} TEMPLATE_REPLY 回复消息的XML模版
 * @static
 */
Info.TEMPLATE_REPLY = 
   '<xml>'
  +  '<ToUserName><![CDATA[<%=user%>]]></ToUserName>'
  +  '<FromUserName><![CDATA[<%=sp%>]]></FromUserName>'
  +  '<CreateTime><%=(new Date().getTime())%></CreateTime>'
  +  '<FuncFlag><%=flag%></FuncFlag>'
  +  '<% if(_.isArray(reply)){ %>'
  +    '<MsgType><![CDATA[news]]></MsgType>'
  +    '<ArticleCount><%=reply.length%></ArticleCount>'
  +    '<Articles>'
  +      '<% _.each(reply, function(item){ %>'
  +        '<% var mapping = item.config.mapping %>'
  +        '<item>'
  +          '<Title><![CDATA[<%=item[mapping.title]%>]]></Title>'
  +          '<Description><![CDATA[<%=item[mapping.description]%>]]></Description>'
  +          '<PicUrl><![CDATA[<%=item[mapping.pic]%>]]></PicUrl>'
  +          '<Url><![CDATA[<%=item[mapping.url]%>]]></Url>'
  +        '</item>'
  +      '<% }); %>'
  +    '</Articles>'
  +  '<% }else{ %>'
  +    '<MsgType><![CDATA[text]]></MsgType>'
  +    '<Content><![CDATA[<%=String(reply)%>]]></Content>'   
  +  '<% }%>'
  +'</xml>';

  module.exports = exports = Info;