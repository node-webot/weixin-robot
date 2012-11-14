var crypto = require('crypto');

var conf = require('../conf');
var WX_TOKEN = conf.weixin;

function sha1(s) {
  var shasum = crypto.createHash('sha1');
  shasum.update(s);
  return shasum.digest('hex');
}
function makeQ() {
  var q = {
    timestamp: (+new Date()),
    nonce: parseInt((Math.random() * 10e10), 10)
  }
  q.signature = sha1([WX_TOKEN, q.timestamp, q.nonce].sort().join(''));
  return q;
}

module.exports = {
  conf: conf,
  xml2json: require('xml2json'),
  should: require('should'),
  request: require('../lib/request'),
  makeAuthQuery: makeQ
};
