"use strict";

var debug = require('debug');
var log = debug('webot:rule:log');
var warn = debug('webot:rule:warn');
var error = debug('webot:rule:error');

var _ = require('underscore')._;
var utils = require('./utils');

/**
 * @class Rule
 *
 * 动作规则
 *
 * 执行流程: pattern -> handler -> register reply rule
 *
 * @constructor 动作规则
 * @param {Mixed}  cfg    Rule的配置
 * @param {String} [prex] 动作名的前缀
 */
function Rule(cfg, prex){
  if(_.isString(cfg)){
    //为字符串时,pattern为通过匹配,handler为直接返回该值
    this.name = prex + '_' + cfg;
    this.description = '发送任意字符,直接返回:' + cfg;
    this.handler = cfg;
  }else if(_.isFunction(cfg)){
    //为函数时,pattern为通过匹配,handler为该函数
    this.name =  prex + '_' + cfg.name;
    this.description = cfg.description || '发送任意字符,直接执行函数并返回';
    this.handler = cfg;
  }else if(_.isArray(cfg)){
    throw new Error('no support cfg type: Array');
  }else if(_.isObject(cfg)){
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
     * @ignore
     */
    _.extend(this,cfg);
    this.name = cfg.name || prex || cfg.pattern;
  }
  if(!this.name) this.name = 'it_is_anonymous_rule';
  return this;
}

/**
 * @property {String} 类标识
 * @readonly
 */
Rule.prototype.xtype = 'Rule';

/**
 * @property {String} 动作的名称, 可选.
 */
Rule.prototype.name = null;

/**
 * @property {String} 动作的描述, 可选.
 */
Rule.prototype.description = null;

/**
 * @property {Mixed} 匹配规则,判断微信消息是否符合该规则
 *
 * 支持的格式:
 *
 * - {String}   直接返回字符串
 * - {RegExp}   仅匹配文本消息,正则式,把匹配组赋值给info.query
 * - {Function} 签名为fn(info):boolean
 * - {NULL}     为空则视为通过匹配
 */
Rule.prototype.pattern = null;

/**
 * @property {Mixed} 消息的处理逻辑
 *
 * 当返回非真值(null/false)时继续执行下一个动作, 否则回复给用户.
 *
 * 支持的格式:
 *
 * - {String}    直接返回字符串
 * - {Array}     直接返回数组中的随机子元素
 * - {Function}  签名为fn(info, rule):String 直接执行函数并返回
 * - {Function}  签名为fn(info, rule, callback(err, reply)) 通过回调函数返回
 * - {Object}    key为pattern, value为handler, 根据匹配的正则去执行对应的handler (注意: 因为是Object,所以执行顺序不一定从上到下)
 */
Rule.prototype.handler = null;

/**
 * @property {Mixed} 后续动作配置
 *
 * 指定下一次用户回复时要使用的动作.
 *
 * 支持的格式:
 *
 * - {{@link Rule}}    参见动作的配置
 * - {Array<{@link Rule}>}  动作数组
 */
Rule.prototype.replies = null;

/**
 * 把rule的cfg转换为标准格式
 *
 * @param  {Rule} cfg    参见动作的构造函数
 *
 * 支持的格式:
 *
 * - {String/Function/Object} 参见动作的构造函数
 * - {Array} 每个元素都是动作的配置,遍历生成动作数组
 * - {Object} 还支持这种方式,生成动作数组: (注意: 因为是Object,所以没有执行顺序)
 *
 *       @example
 *       {
 *         '/^g(irl)?\\??$/i': '猜错',
 *         'boy': function(info, rule, next){
 *           return next(null, '猜对了')
 *         },
 *         'both': '对你无语...'
 *       }
 *
 *
 * @param  {String} [prex] 动作名前缀
 * @return {Array}         rule数组
 * @method convert  返回Rule数组
 * @static
 */
Rule.convert = function(cfg, prex){

  if(Rule.is(cfg)) return cfg;

  var result = [];

  if(_.isString(cfg)){
    ///为字符串时,pattern为通过匹配,handler为直接返回该值
    result.push(new Rule(cfg));
  }else if(_.isFunction(cfg)){
    //为函数时,pattern为通过匹配,handler为该函数
    result.push(new Rule(cfg));
  }else if(_.isArray(cfg)){
    //数组的时候,递归调用
    result = _.map(cfg, function(item){
      return new Rule(item, prex);
    });
  }else if(_.isObject(cfg)){
    if(cfg.handler){
      result.push(new Rule(cfg));
    }else{
      /**
       * Object, 每个key都是pattern, value是handler
       * @ignore
       */
      _.each(cfg, function(item, key){
        result.push(
          new Rule({
            pattern: key,
            handler: item
          },prex)
        );
      });
    }
  }
  return result;
};

/**
 * @method is 判断是否是动作对象
 * @static
 */
Rule.is = function(rule){
  return rule && rule.xtype === 'Rule';
};

/**
 * 判断微信消息是否符合动作规则
 *
 * 使用rule.pattern去匹配info.text, 参见{@link Rule#pattern}
 *
 * @method isMatch
 * @param  {Object}  info    微信发来的消息
 * @param  {Rule}  rule  动作
 * @return {Boolean}         是否匹配
 * @static
 */
Rule.isMatch = function(info, rule){
  rule = Rule.is(rule) ? rule : new Rule(rule);
  log('checking [%s]', rule.name);

  var p = rule.pattern;

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
  if(_.isFunction(p)) return p.call(rule, info);

  //非函数,则仅对文本消息支持正则式匹配
  if(info.type == 'text' && !_.isNull(info.text)){
    //正则式
    var regex = _.isRegExp(p) ? p : utils.str2Regex(p);
    if(regex){
      //正则匹配, 把匹配组赋值给info.query
      info.query = info.text.match(regex);
      log('pattern is regex: %s', info.query);
      return info.query !== null ;
    }else{
      return info.text.indexOf(p) !== -1;
    }
  }

  log('[%s] not match.', rule.name);
  return false;
};

/**
 * 执行动作,返回回复消息.
 *
 * @method exec
 * @param {Object}   info      微信发来的消息
 * @param {Rule}   rule    动作规则
 *
 * 如果不是{@link Rule}则会执行{@link Rule#convert}进行转换
 * 转换后的handler:
 *
 * - NULL: 跳过,执行下一条rule
 * - String: 直接返回字符串
 * - Array: 随机返回数组中的一个元素
 * - Function: 执行函数并返回(视fn的参数签名个数,可以通过直接返回或回调的方式)
 *
 * @param {Function} cb        回调函数
 * @param {Error}    cb.err    错误信息
 * @param {Boolean}  cb.result 回复消息
 *
 * - String: 回复文本消息
 * - Array:  回复图文消息,子元素格式参见 {@link Info#reply}
 * - Null:   执行下一个动作
 *
 * @static
 */
Rule.exec = function(info, rule, cb){
  rule = Rule.is(rule) ? rule : new Rule(rule);

  log('rule [%s] exec', rule.name);

  var fn = rule.handler;
  
  //为空则跳过
  if(_.isNull(fn) || _.isUndefined(fn)){
    warn('handler is null');
    return cb();
  }

  //为数组则直接返回随机的一个子元素
  if( _.isArray(fn) && fn.length>=1){
    log('handler is array: [%s], choose one', fn);
    fn = fn[_.random(0,fn.length-1)];
  }

  //为字符串则直接返回
  if( _.isString(fn)){
    log('handler is string: [%s]', fn);
    if(info.query){
      fn = utils.formatStr(fn, info.query);
      log('replace with capture group: %s -> %s', info.query, fn);
    }
    return cb(null, fn);
  }

  //为函数时
  if(_.isFunction(fn)){
    fn = fn || rule;
    log('handler is function, length=%d', fn.length);
    //只定义了一个参数时直接调用, 否则通过回调
    if(fn.length <= 2){
      //返回false则执行下一个rule
      return cb(null, fn(info, rule));
    }else{
      return fn(info, rule, cb);
    }
  }

  log('handler is nth, %s', rule);
  return cb();
};

module.exports = exports = Rule;
