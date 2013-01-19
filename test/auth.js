/*global beforeEach:false, it:false, describe:false */

var should = require('should');
var WeBot = require('../').WeBot;

var webot = null;
var checkSig = null;
var mockReq = null;
var mockRes = null;


//测试鉴权
describe('auth', function(){
  beforeEach(function(){
    webot = new WeBot();
    checkSig = webot.checkSig('keyboardcat123');
    mockReq = {
      method: 'GET',
      query: {
        timestamp: '1358482535021',
        nonce: '46943956264',
        echostr: 'echostr_2806854154',
        signature: '5b423de6127242a3b98b2f14207b5c881854bd69'
      }
    };
    mockRes = {
      statusCode: '',
      end: function(str){
        mockRes.echostr = str;
      },
      json: function(obj){
        mockRes.json = obj;
      }
    };
  });

  it('should return correct sign', function(){
    var sig = webot.calcSig('keyboardcat123', '1358482535021', '46943956264');
    should.equal(sig.signature, '5b423de6127242a3b98b2f14207b5c881854bd69');
  });

  it('should pass good when get', function(done){
    checkSig(mockReq, mockRes, null);
    mockRes.echostr.should.equal(mockReq.query.echostr);
    done();
  });

  it('should pass next when post', function(done){
    mockReq.method = 'POST';
    checkSig(mockReq, mockRes, function(){});
    mockRes.statusCode.toString().should.not.equal('403');
    done();
  });

  it('should block bad when get with incorrent auth', function(done){
    mockReq.query.signature = 'abc';
    checkSig(mockReq, mockRes, null);
    mockRes.statusCode.toString().should.equal('403');
    done();
  });

  it('should block bad when post without auth', function(done){
    mockReq.method = 'POST';
    mockReq.query = null;
    checkSig(mockReq, mockRes, null);
    mockRes.statusCode.toString().should.equal('403');
    done();
  });

});
