var should = require('should');
var request = require('request');

var bootstrap = require('./bootstrap');
var makeAuthQuery = bootstrap.makeAuthQuery;

var url = 'http://localhost:3000/';

//测试鉴权
describe('Authorize', function(){
  var q = makeAuthQuery();
  q.echostr = 'abc';

  it('should pass good', function(done){
    request.get({
      url: url, 
      qs: q
    }, function(err, res, body){
      should.not.exist(err);
      should.exist(body) && body.should.equal(q.echostr);
      done();
    });
  });

  it('should block bad when get with incorrent auth', function(done){
    q.timestamp = '';
    request.get({
      url: url, 
      qs: q
    },function(err, res, body){
      res.should.have.status(403);
      done();
    });
  });


  it('should block bad when post without auth', function(done){
    request.post({
      url: url
    }, function(err, res, body){
      res.should.have.status(403);
      //should.exist(err) && err.should.be(403);
      //should.not.exist(body);
      done();
    });
  });

});
