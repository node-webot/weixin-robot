var greetings = [];
greetings.push([
  /^(早上?好?|(good )?moring)[啊\!！\.。]*$/i,
  function(info) {
    var d = new Date();
    var h = d.getHours();
    if (h < 3) return '[嘘] 我这边还是深夜呢，别吵着大家了';
    if (h < 5) return '这才几点钟啊，您就醒了？';
    if (h < 7) return '早啊官人！您可起得真早呐~ 给你请安了！\n 今天想参加点什么活动呢？';
    if (h < 9) return 'Morning, sir! 新的一天又开始了！您今天心情怎么样？';
    if (h < 12) return '这都几点了，还早啊...';
    if (h < 14) return '人家中午饭都吃过了，还早呐？';
    if (h < 17) return '如此美好的下午，是很适合出门逛逛的';
    if (h < 21) return '早，什么早？找碴的找？';
    if (h >= 21) return '您还是早点睡吧...';
  }
]);
greetings.push([
  /^(午安|中午好|good noon)[啊\!！\.。]*$/i,
  function(info) {
    var d = new Date();
    var h = d.getHours();
    if (h < 14 && h > 10) return '你也午安了！';
    return '您这问候来得有点不合时宜吧..';
  }
]);
greetings.push([
  /^(下午好|(good )?afternoon)[啊\!！\.。]*$/i,
  function(info) {
    var d = new Date();
    var h = d.getHours();
    if (h < 12) return '这太阳还在东边呢，说下午有点早吧...';
    return '[太阳]你好呀，今天心情怎么样？';
  }
]);
greetings.push([
  /^(晚上好|(good )?evening)[啊\!！\.。]*$/i,
  function(info) {
    var d = new Date();
    var h = d.getHours();
    if (h < 17) return '这不还没到晚上吗？';
    if (h > 20) return '差不多该洗洗睡了哟！早睡有益身体健康';
    return '您也好！要不今晚上去看点戏吧？';
  }
]);

greetings.push([
  /^(现在时刻|时间|现在几点|time)$/,
  function(info) {
    var d = new Date();
    return '现在是北京时间' + pad(d.getHours()) + '点' + pad(d.getMinutes()) + '分';
  }
]);
module.exports = greetings;
