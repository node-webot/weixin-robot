var bootstrap = require('./bootstrap');
var should = bootstrap.should;
var makeQ = bootstrap.makeAuthQuery;
var request = bootstrap.request;
var conf = bootstrap.conf;
var messages = bootstrap.messages;
var url = 'http://localhost:3000/';

describe('Authorize', function() {
  describe('GET', function(){
    var q = makeQ();
    q.echostr = 'abc';
    it('should pass good', function(done) {
      request.get({
        url: url, 
        qs: q
      }, function(err, res, body) {
        should.not.exist(err);
        should.exist(body) && body.should.equal(q.echostr);
        done();
      });
    });
    it('should block bad', function(done) {
      q.timestamp = '';
      request.get({
        url: url, 
        qs: q
      },function(err, res, body){
        should.equal(res.statusCode, 403);
        done();
      });
    });
  });
  describe('POST', function(){
    it('should block bad', function(done) {
      request.get({
        url: url
      }, function(err, res, body) {
        should.equal(res.statusCode, 403);
        //should.exist(err) && err.should.be(403);
        //should.not.exist(body);
        done();
      });
    });
  });
});
