var waiter = require('../lib/waiter')({
  yep: '要|好的|ok'
  nope: /^(不要|不)$/
});

waiter.set('who_create', {
  // 用户发送的内容匹配此内容
  pattern: function(info) {
    var reg = /(什么人|谁|哪位.*)(给|为|帮)?你?(设置|做|配置|制造|制作|设计|创造|生产?)(了|的)?/;
    return reg.test(info.text) && info.text.replace(reg, '').indexOf('你') === 0;
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

module.exports = waiter;
