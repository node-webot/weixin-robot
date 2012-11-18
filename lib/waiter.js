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
function Waiter(rules){
  this.tables = {};
  this.router = null;
  this.rules = rules || {};
  this._data_cache = {};
  return this;
}

Waiter.prototype.reserve = function(uid, act, info) {
  if (act) {
    // reserve a tables first
    this.tables[uid] = act;

    // try get some polite words
    var tip = this.rules[act].tip;

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
  delete this.tables[uid];
  if (this._data_cache[uid]) delete this._data_cache[uid][act];
};

var yep = /^(是|yes|yep|Y|好|要|OK|恩|嗯)[啊的吧嘛\!\.。]*$/i;
var nope = /^(不是|不要|no|nope|不|不好|NO|N|否)[啊的吧嘛\!\.。]*$/i;

// @return {bool} whether to continue router
Waiter.prototype.respond = function(uid, act, info, cb) {
  var self = this;
  var r = self.rules[act].replies;

  function go(r) {
    if (typeof r == 'function') {
      return r.call(self, uid, info, cb);
    }
    return cb(null, r);
  }

 if (typeof r == 'object') {
    var text = info['text'];
    if (text in r) return go(r[text]);
    if ('Y' in r && yep.test(text)) {
      return go(r['Y'])
    }
    if ('N' in r && nope.test(text)) {
      this.pass(uid, act);
      return go(r['N'])
    }
    return true;
  }
  return go(r);
};

module.exports = function(rules) {
  return new Waiter(rules);
};
module.exports.Waiter = Waiter;
