"use strict";

var debug = require('debug');
var log = debug('webot:robot:log');
var warn = debug('webot:robot:warn');
var error = debug('webot:robot:error');

var Wind = require("wind");
var Binding = Wind.Async.Binding;
var Task = Wind.Async.Task;
Wind.logger.level = Wind.Logging.Level.INFO;

var Action = require('./action')
var _ = require('underscore')._

/**
 * @class Robot
 * 微信机器人
 * @author TZ <atian25@qq.com>
 */
function Robot(){
  //路由表
  this.routes = [];
  this.wait_rules = {};
  this.last_wait_rules = {};
  return this;
}

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
Robot.prototype.set = function(pattern, handler, replies){

  var action = (arguments.length==1) ? pattern : {
    pattern: arguments[0],
    handler: arguments[1],
    replies: arguments[2]
  }

  if(action){
    //添加路由
    action = new Action(action)
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
Robot.prototype.get = function(name){
  return !name ? this.routes : _.find(this.routes, function(action){
    return action.name == name;
  }) 
};

/**
 * 等待下一次回复
 * @param  {String} uid    用户ID
 * @param  {Action} action 动作或动作配置
 */
Robot.prototype.wait = function(uid, action){
  var self = this;
  if(action){
    action = Action.convert(action)
    log('add wait route: [%s] for user: %s', getActionName(action), uid);
    self.last_wait_rules[uid] = action;
    self.wait_rules[uid] = action;
  }
  return this;
};

/**
 * 消息处理
 * @param {Object}   info   微信发来的消息
 * @param {Function} cb     回调函数, function(err,reply)
 * @param {Error}    cb.err 错误消息
 * @param {String/Array} cb.reply 回复消息
 * 
 * - String: 文本消息
 * - Array:  图文消息
 * - Null:   执行下一个动作
 */
Robot.prototype.reply = function(info, cb) {
  log('check each action');
  var self = this;

  //要执行的action列表
  var actionList = self.routes;

  //存在waiter则执行
  var waiter = self.wait_rules[info.from]
  if(waiter){
    log('find waiter: %s', getActionName(waiter));
    actionList = [].concat(waiter).concat(self.routes);
    self.wait_rules[info.from] = null;
  }

  //遍历action
  var task = eval(Wind.compile("async", function(){
    try{
      //遍历route
      for (var i = 0; i < actionList.length; i++) {
        var action = actionList[i];
        if(Action.isMatch(info, action)){
          log('match action: [%s]', action.name);
          var result =$await(Robot.execSync(info, action));
          if(result.reply){
            //存在要求回复的动作
            if(action.replies){
              //把replies转为action格式,并提交wait
              self.wait(info.from, Action.convert(action.replies, action.name));
            }
            return cb(null, result.reply);
          }
        }
      };
      return cb('404');
    }catch(err){
      error('Robot.reply exec error: %s', err);
      return cb(err);
    }
  }));
  task().start();
  return this;
}

/**
 * @property {Action} Action Action类
 * @static
 */
Robot.Action = Action;

/**
 * @method exec
 * @inheritdoc Action#exec
 * @static
 */
Robot.exec = Action.exec;

//把执行函数转换为wind的异步任务并执行
Robot.execSync = Binding.fromStandard(Action.exec, 'reply');

/**
 * @method convert
 * @inheritdoc Action#convert
 * @static
 */
Robot.convert = Action.convert;

/**
 * @method isMatch
 * @inheritdoc Action#isMatch
 * @static
 */
Robot.isMatch = Action.isMatch;

/**
 * 获取action名
 * @param  {Action/Array} action 
 * @return {String}        返回动作名,若入参为数组则返回逗号分隔的动作名
 * @private
 */
function getActionName(action){
  if(!action) return ''
  return _.isArray(action) ? _.pluck(action,'name').join(',') : action.name
}

module.exports = exports = Robot;

