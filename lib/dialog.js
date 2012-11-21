var fs = require('fs');

function text2dialog(txt) {
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

function loadDialog(opts) {
  var opts = opts || {};
  var dir = opts.dir || (process.cwd() + '/rules/dialogs');
  var loads = opts.files || ['basic', 'gags', 'bad', 'flirt', 'emoji'];
  var dialogs = [];
  loads.forEach(function(item) {
    var i = item.lastIndexOf('.');
    // load different type of file according to different file extension
    var tmp = i > 0 ? [item.slice(0, i), item.slice(i+1)] : [item, 'txt'];

    var fext = tmp[tmp.length-1];
    if (fext === 'txt') {
      var f = dir + '/' + tmp.join('.');
      var cont = fs.readFileSync(f, 'utf-8');
      var d = text2dialog(cont);
      dialogs.push.apply(dialogs, d);
    } else {
      dialogs.push.apply(dialogs, require(dir + '/' + tmp.join('.')));
    }
  });
  return dialogs;
};
loadDialog.text2dialog = text2dialog;
module.exports = loadDialog;
