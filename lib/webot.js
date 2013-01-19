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

require('js-yaml');

var Utils = require('./utils');
var Info = require('./info');
var Action = require('./action');

var middlewares = require('./middlewares');
//把middlewares托管给WeBot
_.extend(WeBot.prototype, middlewares);

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
function WeBot(){
}

/**
 * @property {Array} routes 规则列表,子元素为{@link Action}
 */
WeBot.prototype.routes = [];

/**
 * @property {Object} wait_rules 下次回复使用的规则
 *
 * - key: uid
 * - value: action或action数组
 */
WeBot.prototype.wait_rules = {};

/**
 * @property {Object} last_wait_rules 上一次的wait_rules
 */
WeBot.prototype.last_wait_rules = {};

/**
 * @property {Object} data_cache 暂存的用户数据, 参见{@link #data}
 */
WeBot.prototype.data_cache = {};

/**
 * @method set 路由, 设定动作规则
 *
 * @param {Mixed} pattern 匹配规则
 *
 *  - 当入参个数只有一个时,该参数作为{@link Action}或Action的配置
 *  - 否者作为匹配规则,参见{@link Action#pattern}
 *
 * @param {Mixed} handler   处理逻辑,参见{@link Action#handler}
 * @param {Mixed} [replies] 下次回复动作,参见{@link Action#replies}
 */
WeBot.prototype.set = function(pattern, handler, replies){
  //函数重载
  var action = (arguments.length==1) ? pattern : {
    name: arguments[0],
    pattern: arguments[0],
    handler: arguments[1],
    replies: arguments[2]
  };

  if(action){
    //添加路由
    action = Action.convert(action);
    log('define route: [%s]', getActionName(action));
    this.routes = this.routes.concat(action);
  }
  return this;
};

/**
 * 获取已注册的动作
 * @param  {String} name  动作名
 * @return {Object/Array} 返回动作,如果入参为空,则返回全部动作.
 */
WeBot.prototype.get = function(name){
  return !name ? this.routes : _.find(this.routes, function(action){
    return action.name == name;
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
WeBot.prototype.data = function(uid, key, value){
  var obj = this.data_cache[uid] = this.data_cache[uid] || {};
  if(_.isString(key)){
    if(_.isNull(value)){
      delete obj[key];
    }else{
      obj[key] = value;
    }
  }else if(_.isObject(key)){
    _.extend(obj, key);
  }
  return obj;
};

/**
 * @method wait 等待下一次回复
 * @param  {String} uid    用户ID
 * @param  {Action} action 动作或动作配置,也可以是数组
 */
WeBot.prototype.wait = function(uid, action){
  var self = this;
  if(action){
    action = Action.convert(action);
    log('add wait route: [%s] for user: %s', getActionName(action), uid);
    self.wait_rules[uid] = action;
  }
  return this;
};

/**
 * 重试上一次等待
 * @param  {String} uid    用户ID
 */
WeBot.prototype.rewait = function(uid){
  var self = this;
  self.wait(uid, self.last_wait_rules[uid]);
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
 *     # 可以是一个action配置,如果没有pattern,自动使用key
 *     yaml: {
 *       name: 'test_yaml_object',
 *       handler: '这是一个yaml的object配置'
 *     }
 *
 * @param  {String/Array} path 路径,必须是全路径.可以是路径数组
 */
WeBot.prototype.dialog = function(path){
  var self = this;
  _.each([].concat(path), function(p){
    //转换 yaml -> object
    var doc = require(p);
    //遍历
    log('load dialog: %s', p);
    _.each(doc, function(item, key){
      var action;
      if(_.isString(item) || _.isArray(item)){
        action = {
          name: 'dialog_' + key,
          pattern: key,
          handler: item
        };
      }else{
        action = item;
        action.pattern = action.pattern || key;
      }
      self.set(action);
    });
  });
  return this;
};

/**
 * @method exec
 * @protected
 * @inheritdoc Action#exec
 */
WeBot.prototype.exec = Action.exec;

//把执行函数转换为wind的异步任务并执行
WeBot.execSync = Binding.fromStandard(Action.exec, 'reply');

/**
 * @method reply 消息处理,遍历已注册的规则,获取回复消息.
 * 参见{@link Action#exec}
 *
 * @param {Object/Info}   data    微信发来的消息,JSON格式
 * @param {Function}      cb      回调函数, function(err,reply)
 * @param {Error}         cb.err  错误消息
 * @param {Info}          cb.info 回复消息,调用info.toXML()即可得到回复的格式
 * @protected
 */
WeBot.prototype.reply = function(data, cb){
  var self = this;

  //转换Info
  log('got req msg: %j', data);
  var info = Info.is(data) ? data : new Info(data);
  if(!self.config.keepBlank && info.text){
    info.text = info.text.trim();
  }

  log('start checking each action');

  //要执行的action列表
  var actionList = self.routes;

  //存在waiter则执行
  var waiter = self.wait_rules[info.user];
  if(waiter){
    log('find waiter: %s', getActionName(waiter));
    actionList = [].concat(waiter).concat(self.routes);
    self.last_wait_rules[info.user] = waiter;
    self.wait_rules[info.user] = null;
  }

  //遍历action
  var task = eval(Wind.compile("async", function(){
    try{
      //遍历route
      for (var i = 0; i < actionList.length; i++){
        var action = actionList[i];
        if(Action.isMatch(info, action)){
          action.count = i;
          log('action [%s] match.', action.name,action.count,info.text);
          var result = $await(WeBot.execSync(info, action));
          if(result.reply){
            //存在要求回复的动作
            if(action.replies){
              //把replies转为action格式,并提交wait
              self.wait(info.user, Action.convert(action.replies, action.name));
            }
            info.reply = result.reply;
            return cb(null, info);
          }
        }
      }
      //未找到匹配的规则
      info.reply = self.getStatus('404') + info.text;
      return cb('404', info);
    }catch(err){
      error('WeBot.reply exec error: %s', err);
      info.reply = self.getStatus(String(err)) || self.getStatus('500');
      return cb(err, info);
    }
  }));
  task().start();
  return this;
};

/**
 * @method monitor  简单的使用webot
 * @param  {String} token 在微信公众平台填入的token
 * @param  {String} path  映射的路径
 * @param  {Object} app   express的实例
 */
WeBot.prototype.monitor = function(token, path, app){
  var self = this;
  var checkSig = self.checkSig(token);

  log('mapping to  %s', path);
  
  //鉴权
  app.get(path, checkSig);

  //消息处理
  app.post(path, checkSig, self.bodyParser(), function(req, res, next) {
    //机器人根据请求提供回复,具体回复规则由 webot.set() 和 webot.wait() 定义
    self.reply(req.wx_data, function(err, info) {
      log('got reply msg: %s, %j', err, info && info.reply);
      //返回消息,必须是XML
      res.type('xml');
      res.send(info.toXML(self.config.mapping));
    });
  });
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
 *   有时候action返回的info.reply列表,里面的对象并不使用标准键值,然后又不想自己用map处理
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
WeBot.prototype.config = {
  keepBlank: true,
  statusMsg: {
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
WeBot.prototype.getStatus = function(code){
  return this.config.statusMsg[String(code)];
};

/**
 * @method getActionName
 * 获取action名
 * @param  {Action/Array} action
 * @return {String}        返回动作名,若入参为数组则返回逗号分隔的动作名
 * @private
 */
function getActionName(action){
  if(!action) return '';
  return _.isArray(action) ? _.pluck(action,'name').join(',') : action.name;
}


/**
 * @property {WeBot} WeBot 机器人
 * @static
 */
WeBot.prototype.WeBot = WeBot;

/**
 * @property {Info} Info 微信消息
 * @static
 */
WeBot.prototype.Info = Info;

/**
 * @property {Action} Action 动作规则
 * @static
 */
WeBot.prototype.Action = Action;

/**
 * @property {Utils} Utils 常用辅助方法
 * @static
 */
WeBot.prototype.Utils = Utils;

module.exports = exports = new WeBot();
