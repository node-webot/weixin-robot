"use strict";

var log = require('debug')('webot:log');
var warn = require('debug')('webot:warn');
var error = require('debug')('webot:error');

var crypto = require('crypto');

/**
 * @class WeBot
 * 
 * 微信公众平台 - 开放消息接口机器人
 *
 * 官方文档: [http://mp.weixin.qq.com/cgi-bin/readtemplate?t=wxm-callbackapi-doc&lang=zh_CN](http://mp.weixin.qq.com/cgi-bin/readtemplate?t=wxm-callbackapi-doc&lang=zh_CN)
 * 
 * - 公众平台用户提交信息后，我们将以GET请求方式请求到填写的Url上,若此次GET请求原样返回echostr参数内容，则接入生效，否则接入失败。
 * - 当普通微信用户向公众账号发消息时，公众平台将POST该消息到填写的Url上（现支持文本消息以及地理位置消息）。
 */
var WeBot = function(conf) {
  if (conf) {
    var k;
    for (k in conf) {
      this.conf[k] = conf[k];
    }
  }
};

/**
 * @property {Info} Info 消息
 * @static
 */
WeBot.Info = require('./info');

/**
 * @property {Robot} Robot 机器人
 * @static
 */
WeBot.Robot = require('./robot');

/**
 * @property {Action} Action 动作规则
 * @static
 */
WeBot.Action = require('./action');

/**
 * @property {Object} 
 * 
 * 错误码的描述,参考HTTP CODE
 * 
 * - 204 : 人工延迟回复,将回复: 「你的消息已经收到，若未即时回复，还望海涵」
 * - 403 : 鉴权失败,将回复: 「鉴权失败,你的Token不正确」
 * - 404 : 没有找到匹配规则, 将回复: 「听不懂你在说什么哦」
 * - 500 : 服务器抛异常,将回复: 「服务器临时出了一点问题，您稍后再来好吗」
 * 
 * @static
 */
WeBot.STATUS_MSG = {
  '204': '你的消息已经收到，若未即时回复，还望海涵',
  '403': '鉴权失败,你的Token不正确',
  '404': '听不懂你在说什么哦', 
  '500': '服务器临时出了一点问题，您稍后再来好吗'
};

WeBot.set = function(p, v){
  this.conf[p] = v;
};
WeBot.unset = function(p){
  delete this.conf[p];
};
WeBot.conf = {};
WeBot.parser = require('./parser');
WeBot.dialogs = require('./dialog');

/**
 * @method checkSig middleware,用于校验该请求是否来源于微信
 * 
 * 加密流程：
 * 1. 将token、timestamp、nonce三个参数进行字典序排序
 * 2. 将三个参数字符串拼接成一个字符串进行sha1加密(key是开发者token)
 * 3. 将加密后的字符串与signature对比,相同则表示该请求来源于微信。
 *
 * @param {String} token 在公众平台设置界面填写的token
 * @return {Function} 用于express的middleware
 * @static
 */
WeBot.checkSig = function(token) {
  return function checkSig(req, res, next) {
    var sig = req.query.signature;
    var timestamp = req.query.timestamp;
    var nonce = req.query.nonce;
    var s = [token, timestamp, nonce].sort().join('');
    var shasum = crypto.createHash('sha1');
    shasum.update(s);
    var dig = shasum.digest('hex');
    if (dig == sig){
      if(req.method == 'GET'){
        return res.end(req.query.echostr);
      }else{
        return next();
      }
    }else{
      log('token mismatch', token);
    }
    //鉴权失败
    return WeBot.blockReq(req, res, next);
  };
};

/**
 * 鉴权失败时回复给微信服务器的消息
 * @static
 */
WeBot.blockReq = function(req, res, next){
  res.statusCode = 403;
  return res.json({ 'err': '403', 'msg': WeBot.STATUS_MSG['403'] });
}

/**
 * @method bodyParser middleware,用于转换微信原始XML消息为{@link Info}
 * 必须为POST请求添加 bodyParser
 * 
 * @param  {Object}  opts 解析微信消息的配置
 * @param  {Boolean} opts.keepBlank 是否保留文本消息的前后空格.
 * @return {Function} 用于express的middleware, 解析后的{@link Info}对象存放在req.wx_data
 * @static
 */
WeBot.bodyParser = function(opts) {
  return function(req, res, next){
    var b = '';
    req.setEncoding('utf-8');
    req.on('data', function(data){
      b += data;
    });
    req.on('end', function() {
      WeBot.Info.parser(b, opts, function(err, info){
        req.wx_data = info
        next();
      });
    });
  };
};

module.exports = exports = WeBot;
