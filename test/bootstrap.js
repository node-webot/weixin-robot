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

var xml2js = require('xml2js');
var xmlParser = new xml2js.Parser();

function parser(xml, opts, cb){
  opts = opts || {};
  
  xmlParser.parseString(xml, function(err, result){
    if (err || !result || !result.xml){
      return cb(err, null);
    }else{
      return cb(err, result.xml);
    }
  })
}
module.exports = {
  parser: parser,
  should: require('should'),
  request: require('request'),
  makeAuthQuery: makeQ
};
