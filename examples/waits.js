
var weibot = require('../lib/weixin');

// 默认的 yep & nope 不止这些
// 具体都有哪些可以看 lib/waiter.js
var waiter =  weibot.waiter({
  yep: /^(要|好的?|ok)$/,
  nope: /^(不要|不)$/
});

waiter.set('who_create', {
  // 用户发送的内容匹配此内容
  pattern: function(info) {
    var reg = /(什么人|谁|哪位.*)(给|为|帮)?你?(设置|做|配置|制造|制作|设计|创造|生产?)(了|的)?/;
    return reg.test(info.text);
  },
  // tip 也可以是一个 function，返回的 string 会被当做回复发给用户
  tip: '一个很猥琐的程序员，要我把他的微信号告诉你吗？',
  // 用户回复肯定回复（要，好的，OK ..），返回 'Y' 代表的回复，
  // 回复否定答复，返回 'N' 代表的回复
  replies: {
    'Y': '好的，他的微信帐号是：YjgxNTQ5ZmQzYTA0OWNjNTQ3NzliNGMyNzRmYjdhMTUK',
    'N': '可惜了啊，其实他还长得蛮帅的' 
  }
});

var reg_search_cmd = /^(搜索?|search\b|s\s+)/;
var do_search = require('./support/search');

waiter.set('search_cmd', {
  pattern: /^(搜索?|search|s)$/,
  tip: '你想搜什么？',
  replies: function(uid, info, next) {
    var q = info.text.replace(reg_search_cmd, '');
    return do_search({ q: q }, next);
  }
});

waiter.set('confirm_synonym', {
  tip: function(uid, data) {
    // 将信息暂存起来，回复里可能会用到
    this.data(uid, 'confirm_synonym', data);
    return '你尝试搜索' + data['q'] + '，但其实搜' + data['wd'] + '得到的信息会更有用一点。要我帮你搜索' + data['wd'] + '吗?';
  },
  replies: {
    'Y': function(uid, info, next) {
      return do_search({ q: this.data(uid, 'confirm_synonym')['wd'] }, next);
    },
    'N': function(uid, info, next) {
      return do_search({ q: this.data(uid, 'confirm_synonym')['q'] }, next);
    }
  },
});

module.exports = waiter;
