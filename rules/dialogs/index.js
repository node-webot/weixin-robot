var fs = require('fs');

function txt2dialog(txt) {
  var dialogs = txt.replace(/(^\s+|\s+$)/, '').split(/\n\s*\n/);
  var i, n, p, r;
  for (i = dialogs.length - 1; i >= 0; i--) {
    n = dialogs[i].indexOf('\n');
    p = dialogs[i].slice(0, n);
    // if pattern is a regexp
    if (/^\/.+\/[igm]*$/.test(p)) p = eval(p);
    r = dialogs[i].slice(n+1).replace(/\n\|\n/g, '\n\n');
    if (r.indexOf('or\n') !== -1) {
      r = r.split(/\s*or\s*\n/);
    }
    dialogs[i] = [p, r];
  }
  return dialogs;
}

function pad(n) {
  if (n < 10) n = '0' + n;
  return n;
}

var loads = module.exports.order = ['basic', 'gags', 'emoji'];
var dialogs = [];
loads.forEach(function(item, i) {
  var f = __dirname + '/' + item + '.txt';
  var cont = fs.readFileSync(f, 'utf-8');
  var d = txt2dialog(cont);
  dialogs.push.apply(dialogs, d);
});
dialogs.push([
  /^(现在时刻|时间|现在几点|time)$/,
  function(info) {
    var d = new Date();
    return '现在是北京时间' + pad(d.getHours()) + '点' + pad(d.getMinutes()) + '分';
  }
]);
module.exports = dialogs;
