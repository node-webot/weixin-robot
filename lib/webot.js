/*global $await:false*/

"use strict";

var debug = require('debug');
var log = debug('webot:robot:log');
var warn = debug('webot:robot:warn');
var error = debug('webot:robot:error');

var Wind = require("wind");
var Binding = Wind.Async.Binding;
var Task = Wind.Async.Task;
Wind.logger.level = Wind.Logging.Level.INFO;

var _ = require('underscore')._;

var Utils = require('./utils');
var Info = require('./info');
var Rule = require('./rule');

var middlewares = require('./middlewares');
// 把 middlewares 托管给Webot
_.extend(Webot.prototype, middlewares);

/**
 * @class Webot
 *
 * 微信公众平台 - 开放消息接口机器人
 *
 * 官方文档: [http://mp.weixin.qq.com/cgi-bin/readtemplate?t=wxm-callbackapi-doc&lang=zh_CN](http://mp.weixin.qq.com/cgi-bin/readtemplate?t=wxm-callbackapi-doc&lang=zh_CN)
 *
 * - 公众平台用户提交信息后，我们将以GET请求方式请求到填写的Url上,若此次GET请求原样返回echostr参数内容，则接入生效，否则接入失败。
 * - 当普通微信用户向公众账号发消息时，公众平台将POST该消息到填写的Url上（现支持文本消息以及地理位置消息）。
 */
function Webot(config){
  config = config || {};
  if (!(this instanceof Webot)) return new Webot(config);
  this.config = _.defaults(config, Webot.defaultConfig);

  // 规则列表,子元素为{@link Rule}
  this.routes = [];

  // 暂存的用户数据
  // TODO: 拆为外部永久存储
  this._data_cache = {};
}

/**
 * @method set 路由, 设定动作规则
 *
 * @param {Mixed} pattern 匹配规则
 *
 *  - 当入参个数只有一个时,该参数作为{@link Rule}或Rule的配置
 *  - 否者作为匹配规则,参见{@link Rule#pattern}
 *
 * @param {Mixed} handler   处理逻辑,参见{@link Rule#handler}
 * @param {Mixed} [replies] 下次回复动作,参见{@link Rule#replies}
 */
Webot.prototype.set = function(pattern, handler, replies){

  // 参数统一化
  var rule = (arguments.length==1) ? pattern : {
    name: arguments[0],
    pattern: arguments[0],
    handler: arguments[1],
    replies: arguments[2]
  };

  rule = Rule.convert(rule);

  log('define route: [%s]', getRuleName(rule));

  // 添加路由
  this.routes = this.routes.concat(rule);

  return this;
};

/**
 * 获取已注册的动作
 * @param  {String} name  动作名
 * @return {Object/Array} 返回动作,如果入参为空,则返回全部动作.
 */
Webot.prototype.get = function(name){
  return !name ? this.routes : _.find(this.routes, function(rule){
    return rule.name == name;
  });
};

/**
 * @method data 为用户保存一些回复时可能需要的数据,或者获取这些数据
 *
 * @param  {String} uid    用户ID
 * @param  {String/Object} key
 *
 * - String 为要保存的键名
 * - Object 把该Object合并到用户数据中
 * - NULL   不做任何修改,直接返回用户的所有数据
 *
 * @param  {String} value 要保存的值,如果为null则删除该key
 * @return {Object}       返回用户的所有数据
 */
Webot.prototype.data = function(uid, key, value){
  var obj = this._data_cache[uid] = this._data_cache[uid] || {};
  if(_.isString(key)){
    if(_.isNull(value)){
      delete obj[key];
    }else if (_.isUndefined(value)) {
      return obj[key]; 
    } else {
      obj[key] = value;
    }
  }else if(_.isObject(key)){
    _.extend(obj, key);
  }else if (_.isNull(key)){
    delete this._data_cache[uid];
    return null;
  }
  return obj;
};

/**
 * @method wait 等待下一次回复
 * @param  {String} uid    用户ID
 * @param  {Rule} rule 动作或动作配置,也可以是数组
 */
Webot.prototype.wait = function(uid, rule){
  var self = this;
  if(rule){
    rule = Rule.convert(rule);
    log('add wait route: [%s] for user: %s', getRuleName(rule), uid);
    self.data(uid, 'waiter', rule);
  }
  return this;
};

/**
 * @private
 * @method _last_waited 上一次的回复规则
 * @param  {String} uid    用户ID
 */
Webot.prototype._last_waited = function(uid, rule){
  if (rule) {
    this.data(uid, 'last_waited', rule);
    return
  }
  return this.data(uid, 'last_waited');
};

/**
 * 重试上一次等待
 * @param  {String} uid    用户ID
 */
Webot.prototype.rewait = function(uid){
  var self = this;
  self.wait(uid, self._last_waited(uid));
  return this;
};

/**
 * 载入yaml格式的文件,并注册为规则
 *
 * 文件格式:
 *
 *     ---
 *     # 直接回复
 *     hi: 'hi,I am robot'
 *
 *     # 匹配组替换
 *     /key (.*)/i:
 *       - '你输入的匹配关键词是:{1}'
 *       - '我知道了,你输入了:{1}'
 *
 *     # 随机回复一个
 *     hello:
 *       - 你好
 *       - fine
 *       - how are you
 *
 *     # 可以是一个rule配置,如果没有pattern,自动使用key
 *     yaml:
 *       name: 'test_yaml_object',
 *       handler: '这是一个yaml的object配置'
 *
 * @param  {String/Array} path 路径,必须是全路径.可以是路径数组
 */
Webot.prototype.dialog = function(path){
  var self = this;
  var args = path;

  if (!Array.isArray(args)) {
    args = [].slice.call(arguments);
  }

  _.each(args, function(p){

    if (typeof p === 'string') {
      log('require dialog file: %s', p);
      p = require(p);
    }

    _.each(p, function(item, key){
      var rule;
      if(_.isString(item) || _.isArray(item)){
        rule = {
          name: 'dialog_' + key,
          pattern: key,
          handler: item
        };
      }else{
        rule = item;
        rule.name = rule.name || 'dialog_' + key;
        rule.pattern = rule.pattern || key;
      }
      self.set(rule);
    });
  });
  return this;
};

/**
 * @method exec
 * @protected
 * @inheritdoc Rule#exec
 */
Webot.prototype.exec = Rule.exec;

//把执行函数转换为wind的异步任务并执行
Webot.execSync = Binding.fromStandard(Rule.exec, 'reply');

/**
 * @method reply 消息处理,遍历已注册的规则,获取回复消息.
 * 参见{@link Rule#exec}
 *
 * @param {Object/Info}   data    微信发来的消息,JSON格式
 * @param {Function}      cb      回调函数, function(err,reply)
 * @param {Error}         cb.err  错误消息
 * @param {Info}          cb.info 回复消息,调用info.toXML()即可得到回复的格式
 * @protected
 */
Webot.prototype.reply = function(data, cb){
  var self = this;

  log('got req msg: %j', data);

  // convert a object to Info instance.
  var info = Info(data);

  if (!self.config.keepBlank && info.text) {
    info.text = info.text.trim();
  }

  //要执行的rule列表
  var ruleList = self.routes;

  //如果用户有 waiting rule 待执行
  var waiter = self.data(info.user, 'waiter');
  if (waiter) {
    log('found waiter: %s', getRuleName(waiter));

    ruleList = [].concat(waiter).concat(self.routes);

    // 将此项 wait 标记为已解决
    self.data(info.user, 'waiter', null);
    // 但把它存在另外的地方
    self._last_waited(info.user, waiter);
  }

  //遍历rule
  var task = eval(Wind.compile("async", function(){
    try{
      //遍历route
      for (var i = 0; i < ruleList.length; i++) {
        var rule = ruleList[i];
        if (Rule.isMatch(info, rule)) {
          rule.count = i;
          log('rule [%s] matched', rule.name);
          var result = $await(Webot.execSync(info, rule));
          if(result.reply){
            //存在要求回复的动作
            if(rule.replies){
              //把replies转为rule格式,并提交wait
              self.wait(info.user, Rule.convert(rule.replies, rule.name));
            }
            info.reply = result.reply;
            return cb(null, info);
          }
        }
      }
      //未找到匹配的规则
      info.reply = self.code2reply(404) + info.text;
      return cb(404, info);
    }catch(err){
      error('Webot.reply exec error: %s', err);
      info.reply = self.code2reply(err) || self.code2reply(500);
      return cb(err, info);
    }
  }));
  task().start();
  return this;
};

/**
 * @property {Object} config 配置选项
 *
 * - keepBlank {String} 是否保留文本消息的前后空格
 * - statusMsg {Object} 异常消息的友好回复,参考HTTP CODE
 *
 *   - 204 : 人工延迟回复,将回复: 「你的消息已经收到，若未即时回复，还望海涵」
 *   - 403 : 鉴权失败,将回复: 「鉴权失败,你的Token不正确」
 *   - 404 : 没有找到匹配规则, 将回复: 「听不懂你在说什么哦」
 *   - 500 : 服务器抛异常,将回复: 「服务器临时出了一点问题，您稍后再来好吗」
 *
 * - mapping {Object/Function} 图文列表的属性对应关系,
 *   有时候rule返回的info.reply列表,里面的对象并不使用标准键值,然后又不想自己用map处理
 *   支持格式:
 *
 *   - {Object} 使用以下映射关系:
 *     - title : 图文标题
 *     - description : 图文描述
 *     - pic : 图片地址
 *     - url : 原文地址
 *
 *   - {Function} 签名为 function(item, index, info): item
 */
Webot.defaultConfig = {
  keepBlank: true,
  codeReplies: {
    '204': '你的消息已经收到，若未即时回复，还望海涵',
    '403': '鉴权失败,你的Token不正确',
    '404': '听不懂你说的: ',
    '500': '服务器临时出了一点问题，您稍后再来好吗'
  },
  mapping:{
    'title': 'title',
    'description': 'description',
    'pic': 'pic',
    'url': 'url'
  }
};

/**
 * 根据status code 获取友好提示消息
 * @param  {Error} code  错误码,
 * @return {String}      提示消息
 * @protected
 */
Webot.prototype.code2reply = function(code){
  return this.config.codeReplies[String(code)];
};

/**
 * @method getRuleName
 * 获取rule名
 * @param  {Rule/Array} rule
 * @return {String}        返回动作名,若入参为数组则返回逗号分隔的动作名
 * @private
 */
function getRuleName(rule){
  if(!rule) return '';
  return _.isArray(rule) ? _.pluck(rule,'name').join(',') : rule.name;
}


/**
 * @property {Webot} Webot 机器人
 * @static
 */
Webot.prototype.Webot = Webot;

/**
 * @property {Info} Info 微信消息
 * @static
 */
Webot.prototype.Info = Info;

/**
 * @property {Rule} Rule 动作规则
 * @static
 */
Webot.prototype.Rule = Rule;

/**
 * @property {Utils} Utils 常用辅助方法
 * @static
 */
Webot.prototype.Utils = Utils;

module.exports = new Webot();
module.exports.Webot = module.exports.WeBot = Webot;
