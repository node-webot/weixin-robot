/*global beforeEach:false, it:false, describe:false */

var should = require('should');
var WeBot = require('../').WeBot;

var webot = null;
var data = null;


//测试规则
describe('rule_simple', function(){
  beforeEach(function(){
    webot = new WeBot();
    data = {
      FromUserName: 'mocha',
      ToUserName: 'webot',
      CreateTime: new Date().getTime().toString(),
      MsgType: 'text',
      Content: null
    };
  });

  it('should return hi msg', function(done){
    webot.set('hi', 'hi, I am webot');
    data.Content = 'hi';
    webot.reply(data, function(err, info){
      should.not.exist(err);
      info.reply.should.equal('hi, I am webot');
      done();
    });
  });

  it('should return 404 msg', function(done){
    webot.reply(data, function(err, info){
      err.toString().should.equal('404');
      done();
    });
  });

  it('should return store data', function(done){
    webot.set('set', function(info){
      webot.data(info.user, 'key','value');
    });
    
    webot.set('get', function(info){
      return webot.data(info.user).key;
    });

    data.Content = 'set';
    webot.reply(data, function(err, info){
      data.Content = 'get';
      webot.reply(data, function(err, info){
        should.equal(info.reply,'value');
        done();
      });
    });
  });

});
