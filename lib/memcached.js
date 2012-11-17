var Memcached = require('memcached');
var conf = require('../conf');

var mc = new Memcached(conf.memcached.hosts, conf.memcached.options);

// One day in seconds.
var oneDay = 86400;

var uid_count = 0;
function uuid() {
  return 'id' + uid_count++;
};

function MemObj() {
  var args = Array.prototype.slice.apply(arguments);
  if (args.length == 0) args[0] = uuid();
  this.client = mc;
  this._key = args;
}
MemObj.prototype.get = function(sid, fn) {
  var self = this;
  var sid = self._key.concat(sid).join(':');
  self.client.get(sid, function(err, data) {
    try {
      fn(null, JSON.parse(data.toString()));
    } catch (err) {
      fn && fn(err);
    }
  });
};
MemObj.prototype.set = function(sid, sess, fn) {
  var self = this;
  var sid = self._key.concat(sid).join(':');
  try {
    var maxAge = sess && sess.maxAge;
    var ttl = 'number' === typeof maxAge ? maxAge / 1000 | 0 : oneDay;

    sess = JSON.stringify(sess);

    self.client.set(sid, sess, ttl, function() {
      fn && fn.apply(self, arguments);
    });
  } catch (err) {
    fn && fn(err);
  }
};

module.exports.MemObj = MemObj;
module.exports.mc = mc;
