var log =  require('debug')('weixin:waiter');

// Waiting for the user to answer
// Rule format:
//   {
//     tip: 'What do you want to do next? Reply "a" for "Cool Thing A", Reply "b" for "Cool Thing B".'
//     replies: {
//       'a': 'Coole Thing A',
//       'b': function(info, cb) {
//           return cb(null, 'Cool Thing B');
//        }
//     }
function Waiter(opts){
  this.tables = {};
  this.router = null;
  this.rules = [];
  this.rules_index = {};
  this._data_cache = {};

  opts = opts || {};
  this.yep = opts.yep || yep;
  this.nope = opts.nope || nope;
  return this;
}

Waiter.prototype.set = function(act, conf){
  if (!act || !conf) throw new Error('invalid Waiter rule');
  log('add waiter rule: %s', act)
  this.rules_index[act] = this.rules.length;
  conf['name'] = act;
  this.rules.push(conf);
};

Waiter.prototype.reserve = function(uid, act, info) {
  if (act) {
    // reserve a tables first
    this.tables[uid] = act;

    // try get some polite words
    var i = this.rules_index[act];
    var tip = this.rules[i].tip;

    if (typeof tip === 'function') {
      return tip.call(this, uid, info);
    }
    return tip;
  }
  return this.tables[uid];
};
Waiter.prototype.data = function(uid, n, v) {
  var obj = this._data_cache[uid] = this._data_cache[uid] || {};
  if (v) {
    return obj[n] = v;
  }
  if (typeof n == 'object') {
    for (var k in n) {
      obj[k] = n[k];
    }
  } else if (n) {
    return obj[n];
  }
  return obj;
};
Waiter.prototype.pass = function(uid, act) {
  this.tables[uid] = null;
  delete this.tables[uid];
  if (this._data_cache[uid]) delete this._data_cache[uid][act];
};

var yep = /^(是|yes|yep|yeah|Y|阔以|可以|要得|好|需?要|OK|恩|嗯|找|搜|搞起)[啊的吧嘛诶啦唉哎\!\.。]*$/i;
var nope = /^(不是|不需?要|不必|不用|不需|no|nope|不|不好|NO|N|否|算了)[啊的吧嘛诶啦唉哎\!\.。]*$/i;

// @return {bool} whether to continue router
Waiter.prototype.respond = function(uid, act, info, cb) {
  var self = this;
  var i = self.rules_index[act];
  var r = self.rules[i].replies;

  function go(r) {
    var ret;
    if (typeof r == 'function') {
      ret = r.call(self, uid, info, cb);
    } else {
      ret = cb(null, r)
    }
    self.pass(uid, act);
    return;
  }

 if (typeof r == 'object') {
    var text = info['text'];
    if (text in r) return go(r[text]);
    if ('Y' in r && self.yep.test(text)) {
      return go(r['Y'])
    }
    if ('N' in r && self.nope.test(text)) {
      return go(r['N'])
    }
    for (var t in r) {
      if (text.search(t) !== -1) {
        return go(r[t]);
      }
    }
    return true;
  }
  return go(r);
};

module.exports = function(rules) {
  return new Waiter(rules);
};
module.exports.Waiter = Waiter;
