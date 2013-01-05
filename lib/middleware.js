var crypto = require('crypto');
var log = require('debug')('weixin');

var parser = require('./parser');

var middlewares = {};

middlewares.checkSig = function(wx_token) {
  return function checkSig(req, res, next) {
    var sig = req.query.signature;
    var timestamp = req.query.timestamp;
    var nonce = req.query.nonce;
    var s = [wx_token, timestamp, nonce].sort().join('');
    var shasum = crypto.createHash('sha1');
    shasum.update(s);
    var dig = shasum.digest('hex');
    if (dig == sig) {
      if (req.method == 'GET') {
        return res.send(req.query.echostr);
      } else {
        return next();
      }
    } else {
      log('token mismatch', wx_token);
    }
    return blockReq(res);
  };
};
/*
* The request body parser middleware
*
* Available options:
*   keepBlank: whether to keep heading and tailing blankspace of message text 
*/
middlewares.bodyParser = function(opts) {
  return function(req, res, next) {
    var b = '';
    req.setEncoding('utf-8');
    req.on('data', function(data) {
      b += data;
    });
    req.on('end', function() {
      parser(b, opts, function(err,result){
        req.wx_data = result
        next();
      });
    });
  };
}

function blockReq(res) {
  res.statusCode = 403;
  return res.json({ 'r': 403, 'msg': 'Where is your key?' });
}

module.exports = middlewares;
