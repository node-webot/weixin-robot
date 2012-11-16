var locs = {};

function User(uid) {
  this.uid = uid;
}

User.prototype.loc = function(loc) {
  if (loc) locs[this.uid] = loc;
  return locs[this.uid];
};
User.prototype.locName = function() {
  return cities[this.loc()];
};

module.exports = function(uid) {
  return new User(uid);
};

module.exports.User = User;
