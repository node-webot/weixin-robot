function pad(n) {
  if (n < 10) n = '0' + n;
  return n;
}

var r_love = []
module.exports = [
  [/^(现在时刻|时间|现在几点|time)$/, function(info) {
    var d = new Date();
    return '现在是北京时间' + pad(d.getHours()) + '点' + pad(d.getMinutes()) + '分';
  }]
];
