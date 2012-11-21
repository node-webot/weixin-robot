var crypto = require('crypto');

var WX_TOKEN = 'keyboardcat123';

function sha1(s) {
  var shasum = crypto.createHash('sha1');
  shasum.update(s);
  return shasum.digest('hex');
}
function makeQ(token) {
  var token = token || WX_TOKEN;
  var q = {
    timestamp: (+new Date()),
    nonce: parseInt((Math.random() * 10e10), 10)
  }
  q.signature = sha1([token, q.timestamp, q.nonce].sort().join(''));
  return q;
}

module.exports = {
  xml2json: require('xml2json'),
  should: require('should'),
  request: require('../lib/request'),
  makeAuthQuery: makeQ
};
