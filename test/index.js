var http = require('http');
var crypto = require('crypto');
var fs = require('fs');

var should = require('should');
var xml2json = require('xml2json');

var request = require('../lib/request');
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

describe('Authorize', function() {
  describe('GET', function(){
    var q = makeQ();
    q.echostr = 'abc';
    it('should pass good', function(done) {
      request('/', q, function(err, ret) {
        should.not.exist(err);
        should.exist(ret) && ret.should.equal(q.echostr);
        done();
      });
    });
    it('should block bad', function(done) {
      q.timestamp = '';
      request('/', q, function(err, ret) {
        should.exist(err) && err.should.be(403);
        should.not.exist(ret);
        done();
      });
    });
  });
  describe('POST', function(){
    it('should block bad', function(done) {
      request('/', function(err, ret) {
        should.exist(err) && err.should.be(403);
        should.not.exist(ret);
        done();
      });
    });
  });
});
describe('Events', function() {
  describe('list', function() {
    var xml;
    before(function(done) {
      var req = request.build('POST /', makeQ(), function(err, ret) {
        xml = JSON.parse(xml2json.toJson(ret)).xml;
        done();
      });
      fs.createReadStream(__dirname + '/wx_text.xml').pipe(req);
    });
    it('should have articles', function() {
      xml.ArticleCount.should.above(0);
    });
    it('articles length should match ArticleCount', function() {
      xml.ArticleCount.should.equal(xml.Articles.item.length);
    });
  });
});
