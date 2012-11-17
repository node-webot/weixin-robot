var memcached = require('./memcached');
var mc = memcached.mc;
var MemObj = memcached.MemObj;

function User(uid) {
  this.uid = uid;
  this._cache = new MemObj('user', uid);
  this.getLoc();
}

User.prototype.getLoc = function(fn) {
  var self = this;
  if (self.loc_id && fn) return fn(null, self.loc_id);
  return this._cache.get('loc', function(err, res) {
    self.loc_id = res;
    fn && fn.apply(self, arguments);
  });
};
User.prototype.setLoc = function(loc, fn) {
  this.loc_id = loc;
  return this._cache.set('loc', loc, fn);
};
User.prototype.locName = function() {
  return cities[this.loc_id];
};

module.exports = function(uid) {
  return new User(uid);
};

module.exports.User = User;
