"use strict";

/**
 * @class WeiXin
 * 
 * 微信平台助手
 */
var weixin = function(conf) {
  if (conf) {
    var k;
    for (k in conf) {
      this.conf[k] = conf[k];
    }
  }
};

weixin.set = function(p, v){
  this.conf[p] = v;
};
weixin.unset = function(p){
  delete this.conf[p];
};
weixin.conf = {};
weixin.parser = require('./parser');
weixin.dialogs = require('./dialog');
weixin.request = require('./request');
weixin.middleware = require('./middleware');

weixin.Robot = require('./robot');

weixin.geo2loc = function geo2loc(lnglat, cb) {
  require('./request')('GET http://restapi.amap.com/rgeocode/simple', {
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
/**
 * @method checkSig 检查请求权限的middleware
 * @static
 */
weixin.checkSig = weixin.middleware.checkSig

/**
 * @method bodyParser 转换微信原始XML消息为{@link Info} , 必须为POST请求添加 bodyParser
 * @static
 */
weixin.bodyParser = weixin.middleware.bodyParser

module.exports = weixin;
