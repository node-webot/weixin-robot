/**
 * Action 动作/规则
 * @author TZ <atian25@qq.com>
 */
"use strict";

var debug = require('debug');
var log = debug('weixin:action:log');
var warn = debug('weixin:action:warn');
var error = debug('weixin:action:error');

var _ = require('underscore')._

/**
 * @class Action
 * 
 * 动作,定义机器人回复规则.
 * 执行流程: pattern -> parser -> handler -> register reply action
 * 
 * @param {Object} cfg 动作配置
 * 
 * @param {Mixed}  cfg.name 动作名称
 * 
 * @param {Mixed}  cfg.pattern 匹配规则
 * - {String}   仅匹配文本消息,文字模糊匹配
 * - {RegExp}   仅匹配文本消息,正则式
 * - {Function} 签名为fn(info):boolean
 * - {NULL}     为空则视为通过匹配
 * 
 * @param {Mixed}  cfg.parser  参数提取规则
 * 
 * @param {Mixed}  cfg.handler 执行函数
 * - {String}    直接返回字符串
 * - {Function}  签名为fn(info):String 直接执行函数并返回
 * - {Function}  签名为fn(info, callback(err, reply)):String 通过回调函数返回
 * - {Object}    key为pattern, value为handler
 * 
 * @param {Mixed}  cfg.replies 后续动作配置
 * - {Action}   已经构建好的动作
 * - {Function} 同cfg.handler
 * - {Object}   同cfg.handler
 */
function Action(cfg){
  this.name = cfg.name;
  this.pattern = cfg.pattern;
  this.handler = cfg.handler;
  return this;
};



module.exports = exports = Action;