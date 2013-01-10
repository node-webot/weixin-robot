var debug = require('debug');
var log = debug('weixin:robot:log');
var warn = debug('weixin:robot:warn');
var error = debug('weixin:robot:error');

var Wind = require("wind");
var Binding = Wind.Async.Binding;
var Task = Wind.Async.Task;
Wind.logger.level = Wind.Logging.Level.INFO;

var _ = require('underscore')._

/**
 * Robot 机器人
 * @author TZ <atian25@qq.com>
 */
function Robot(){
  //路由表
  this.routes = [];
  this.wait_rules = {};
  return this;
}

/**
 * 设定路由规则
 * @param  {Action} action 动作
 * @param  {String} action.name 动作名称
 * @param  {String} [action.description] 动作描述
 * @param  {Mixed}  action.pattern 匹配规则
 * @param  {Mixed}  action.handler 执行动作
 * @return {Array}         返回动作,如果入参为空,则返回全部动作.
 */
Robot.prototype.route = function(action){
  if(action){
    //添加路由
    action = Robot.convert(action)
    log('define route: [%s]', _.pluck(action,'name').join(','));
    this.routes = this.routes.concat(action);
  }
  return this
};

/**
 * 返回动作列表
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
 * @param  {Action} action 动作
 * @param  {String} [prex] 动作命名的前缀,可选
 * 支持2种格式, 具体看示例
 */
Robot.prototype.wait = function(uid, action, prex){
  var self = this;
  if(action){
    action = Robot.convert(action, prex||action.name)
    log('add wait route: [%s] for user: %s', _.pluck(action,'name').join(','), uid);
    self.wait_rules[uid] = action;
  }
  return self.wait_rules[uid];
};

/**
 * 消息处理
 * @param  {Object}   info 微信发来的消息
 * @param  {Function} cb   回调函数, function(err,reply)
 */
Robot.prototype.reply = function(info, cb) {
  log('check each action');
  var self = this;

  //要执行的action列表
  var actionList = self.routes;

  //存在waiter则执行
  var waiter = self.wait_rules[info.from]
  if(waiter){
    log('find waiter: %s', _.pluck(waiter, 'name').join(','));
    actionList = [].concat(waiter).concat(self.routes);
    self.wait_rules[info.from] = null;
  }

  //遍历action
  var task = eval(Wind.compile("async", function(){
    try{
      //遍历route
      for (var i = 0; i < actionList.length; i++) {
        var action = actionList[i];
        if(Robot.isMatch(info, action)){
          log('match action: [%s]', action.name);
          var result =$await(Robot.execSync(info, action));
          if(result.reply){
            //存在要求回复的动作
            if(action.replies){
              //把replies转为action格式,并提交wait
              self.wait(info.from, action.replies, action.name);
            }
            return cb(null, result.reply);
          }
        }
      };
      return cb(Robot.ERROR_MSG['404']);
    }catch(err){
      log('Robot.reply exec error: %s', err);
      return cb(err, Robot.ERROR_MSG[String(err)] || Robot.ERROR_MSG['500']);
    }
  }));
  task().start()
}

/**
 * 把action的cfg转换为标准格式
 * @param  {Action} cfg  见代码注释
 * @param  {[type]} prex [description]
 * @return {Array}       action数组
 */
Robot.convert = function(cfg, prex){
  var result = [];

  if(_.isString(cfg)){
    /**
     * 为字符串时,pattern为通过匹配,handler为直接返回该值
     */
    result.push({
      name: prex + '_' + cfg,
      description: '发送任意字符,直接返回:' + cfg,
      //pattern: null,
      handler: cfg
    })
  }else if(_.isFunction(cfg)){
    /**
     * 为函数时,pattern为通过匹配,handler为该函数
     */
    result.push({
      name: prex + '_' + cfg.name,
      description: cfg.description || '发送任意字符,直接执行函数并返回',
      //pattern: null,
      handler: cfg
    })
  }else if(_.isArray(cfg)){
    /**
     * 数组的时候,递归调用
     */
    result = _.map(cfg, function(item){
      return Robot.convert(item, prex);
    });
  }else if(_.isObject(cfg)){
    if(cfg.handler){
      /**
       * 匹配这种格式:
       * {
       *   name: 'say_hi', 
       *   description: 'pattern可以用正则表达式匹配,试着发送「hi」',
       *   pattern: /^Hi/i,
       *   handler: function(info) {
       *     //回复的另一种方式
       *     return '你也好哈';
       * }
       */
      cfg.name = cfg.name || prex
      result.push(cfg)
    }else{
      /**
       * 匹配这种格式:
       * {
       *   '/^g(irl)?\\??$/i': '猜错',
       *   'boy': function(info, action, next){
       *     return next(null, '猜对了')
       *   },
       *   'both': '对你无语...'
       * }
       */
      _.each(cfg, function(item, key){
        result.push({
          name: prex + '_' + key,
          pattern: key,
          handler: item
        })
      })
    }
  }
  return result
};

/**
 * 判断微信消息是否符合动作规则
 * 
 * 使用action.pattern去匹配info.text, 支持的pattern格式:
 * 
 * - {String}   仅匹配文本消息,文字模糊匹配
 * - {RegExp}   仅匹配文本消息,正则式,把匹配组赋值给info.query
 * - {Function} 签名为fn(info):boolean
 * - {NULL}     为空则视为通过匹配
 *
 * @param  {Object}  info    微信发来的消息
 * @param  {Action}   action 动作
 * @return {Boolean}         是否匹配
 */
Robot.isMatch = function(info, action){
  log('checking [%s]', action.name);
  var p = action.pattern;

  //info为空则视为不匹配
  if(_.isNull(info)){
    warn('info is null');
    return false;
  }

  //为空则视为通过匹配
  if(_.isNull(p) || _.isUndefined(p)){
    warn('pattern is null');
    return true;
  }

  //pattern为函数则直接使用
  if(_.isFunction(p)) return p.call(action, info);

  //非函数,则仅对文本消息支持正则式匹配
  if(info.type == 'text' && !_.isNull(info.text)){
    //正则式
    var regex = _.isRegExp(p) ? p : str2Regex(p);
    if(regex){
      //正则匹配, 把匹配组赋值给info.query
      info.query = info.text.match(regex);
      log('pattern is regex: %s', info.query);
      return info.query !== null ;
    }else{
      log('aaa',info.text, p,info.text.indexOf(p), info.text.indexOf(p) !== -1)
      return info.text.indexOf(p) !== -1
    }
  }

  log('[%s] not match.', action.name);
  return false;
};

/**
 * 执行动作handler,返回回复消息.
 * 
 * 支持的handler格式:
 * 
 * - {String}    直接返回字符串
 * - {Function}  签名为fn(info, action):String 直接执行函数并返回
 * - {Function}  签名为fn(info, action, callback(err, reply)) 通过回调函数返回
 * - {Object}    key为pattern, value为handler
 *
 * @param {Object}   info      微信发来的消息
 * @param {Action}   action    动作
 * @param {Function} cb        回调函数
 * @param {Error}    cb.err    错误信息
 * @param {Boolean}  cb.result 回复消息,不为NULL/FALSE则不再执行后面的action
 * @param {Boolean}  cb.wait   等待下一次回复的action
 */
Robot.exec = function(info, action, cb){
  log('exec action: [%s]', action.name);
  var fn = action.handler;

  //TODO: 转换参数
  
  //为空则跳过
  if(_.isNull(fn) || _.isUndefined(fn)){
    warn('handler is null')
    return cb();
  }

  //为字符串则直接返回
  if( _.isString(fn)){
    log('handler is string: [%s]', fn)
    return cb(null, fn);
  }

  //为函数时
  if(_.isFunction(fn)){
    fn = fn || action
    log('handler is function, length=%d', fn.length)
    //只定义了一个参数时直接调用, 否则通过回调
    if(fn.length <= 2){
      //返回false则执行下一个action
      return cb(null, fn(info, action)); 
    }else{
      return fn(info, action, cb);
    }
  }
  
  log('handler is nth, %s', action)
  return cb();
}

//把执行函数转换为wind的异步任务并执行
Robot.execSync = Binding.fromStandard(Robot.exec, 'reply');

/**
 * 错误码
 */
Robot.ERROR_MSG = {
  '404': '听不懂你在说什么哦', 
  '204': '你的消息已经收到，若未即时回复，还望海涵',
  '500': '服务器临时出了一点问题，您稍后再来好吗'
};

/**
 * @method str2Regex
 * 把字符串转为正则式,不是正则式则返回NULL
 */
function str2Regex(str){
  //var rule = /\/(\\[^\x00-\x1f]|\[(\\[^\x00-\x1f]|[^\x00-\x1f\\\/])*\]|[^\x00-\x1f\\\/\[])+\/([gim]*)/;
  var rule = /\/(.*)\/(?=[igm]*)([igm]*)/
  var match = str.match(rule);
  return match ? new RegExp(match[1],match[2]) : null;
}

module.exports = exports = function() {
  return new Robot();
};
module.exports.Robot = Robot;
