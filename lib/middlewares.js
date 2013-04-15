"use strict";

var log = require('debug')('webot:middlewares:log');
var warn = require('debug')('webot:middlewares:warn');
var error = require('debug')('webot:middlewares:error');

var crypto = require('crypto');
var xml2js = require('xml2js');
var xmlParser = new xml2js.Parser();
var _ = require('underscore')._;

var Info = require('./info');

/**
 * @class WeBot
 */
var middlewares = {};

/**
 * @method checkSig middleware,用于校验该请求是否来源于微信
 *
 * 加密流程：
 *
 * 1. 将token、timestamp、nonce三个参数进行字典序排序
 * 2. 将三个参数字符串拼接成一个字符串进行sha1加密(key是开发者token)
 * 3. 将加密后的字符串与signature对比,相同则表示该请求来源于微信。
 *
 * @param {String} token 在公众平台设置界面填写的token
 * @return {Function} 用于express的middleware
 * @protected
 */
middlewares.checkSig = function(token){
  return function checkSig(req, res, next){
    var query = req.query || {};
    var sig = query.signature;
    var dig = middlewares.calcSig(token, query.timestamp, query.nonce).signature;
    if (dig == sig){
      if(req.method == 'GET'){
        return res.end(query.echostr);
      }else{
        return next();
      }
    }else{
      log('token mismatch: %s', token);
    }
    //鉴权失败
    return middlewares.blockReq(req, res, next);
  };
};

/**
 * @method calcSig 计算鉴权
 * @param  {String} token         在公众平台设置界面填写的token
 * @param  {String} [timestamp]   时间戳
 * @param  {String} [nonce]       随机串
 * @return {Object}               token, timestamp, nonce, echostr, signature
 */
middlewares.calcSig = function(token, timestamp, nonce){
  var obj = {
    token: token,
    timestamp: timestamp || new Date().getTime().toString(),
    nonce: nonce || parseInt((Math.random() * 10e10), 10).toString(),
    echostr: 'echostr_' + parseInt((Math.random() * 10e10), 10).toString()
  };

  var s = [obj.token, obj.timestamp, obj.nonce].sort().join('');
  obj.signature = crypto.createHash('sha1').update(s).digest('hex');
  return obj;
};

/**
 * @method blockReq 鉴权失败时回复给微信服务器的消息
 * @protected
 */
middlewares.blockReq = function(req, res, next){
  res.statusCode = 403;
  return res.json({ 'err': '403', 'msg': '鉴权失败,你的Token不正确'});
};

/**
 * @method bodyParser middleware,用于转换微信原始XML消息为{@link Info}, 必须为POST请求添加 bodyParser
 * @return {Function} 用于express的middleware, 解析后的{@link Info}对象存放在req.wx_data
 * @protected
 */
middlewares.bodyParser = function(options){
  var self = this;
  return function(req, res, next){
    var b = '';
    req.setEncoding('utf-8');
    req.on('data', function(data){
      b += data;
    });
    req.on('end', function(){
      //解析XML并转换为JSON,实例化Info
      xmlParser.parseString(b, function(err, result){
        if (err || !result || !result.xml){
          error('parse xml body failed', err, result);
          return next(err || '400');
        }else{
          var data = result.xml;
          //data.originJSON = json;
          //data.originXML = xml;
          req.wx_data = Info(data);
          return next();
        }
      });
    });
  };
};


/**
 * @method session 生成
 * @protected
 */
middlewares.session = function(options){
  options = options || {};

  var store = options.store;

  return function(req, res, next) {
    var info = req.wx_data;

    var end = res.end;
    res.end = function(data, encoding) {
      res.end = end;
      var sess = info.session;
      if (!sess) return res.end(data, encoding);
      sess.save(sess.id, function(err) {
        if (err) console.error(err.stack);
        res.end(data, encoding);
      });
    };

    store.get(info.from, function(err, s) {
      info.session = new Session(info, s);
      error('get session failed: ', err);
      info.sessionStore = store;
      next();
    });
  };
};

/**
 * @deprecated
 * @method monitor Legacy API
 */
middlewares.monitor = function(token, path, app){
  return this.watch(app, path, token);
};

/**
 * @method watch 监听 express 服务
 * @param  {Object} app   express实例
 * @param  {String} path  映射的路径，默认为 '/'
 * @param  {String} token 在微信公众平台填入的token
 */
middlewares.watch = function(app, path, token){
  var self = this;

  if (!token) {
    token = path;
    path = null;
  }
  path = path || '/';

  var checkSig = self.checkSig(token);

  log('webot watching at %s', path);
  
  //鉴权
  app.get(path, checkSig);
  //消息处理
  app.post(path, checkSig, self.bodyParser(), function(req, res, next) {
    self.reply(req.wx_data, function(err, info) {

      res.type('xml');

      res.send(info.toXML(self.config.mapping));
    });
  });

  return this;
};

module.exports = exports = middlewares;
