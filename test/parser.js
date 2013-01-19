/*global beforeEach:false, it:false, describe:false */

var should = require('should');
var _ = require('underscore')._;

var WeBot = require('../').WeBot;

var webot = null;
var bodyParser = null;
var mockReq = null;
var mockRes = null;
var info = null;

var emptyFn = function(){};

var getXML = function(info){
  _.defaults(info, {
    sp: 'webot',
    user: 'client'
  });

  var tpl= [
    '<xml>',
      '<ToUserName><![CDATA[<%=sp%>]]></ToUserName>',
      '<FromUserName><![CDATA[<%=user%>]]></FromUserName>',
      '<CreateTime><%=(new Date().getTime())%></CreateTime>',
      '<MsgType><![CDATA[<%=type%>]]></MsgType>',
      '<% if(type=="text"){ %>',
        '<Content><![CDATA[<%=text%>]]></Content>',
      '<% }else if(type=="location"){  %>',
        '<Location_X><%=xPos%></Location_X>',
        '<Location_Y><%=yPos%></Location_Y>',
        '<Scale><%=scale%></Scale>',
        '<Label><![CDATA[<%=label%>]]></Label>',
      '<% }else if(type=="image"){  %>',
        '<PicUrl><![CDATA[<%=pic%>]]></PicUrl>',
      '<% } %>',
    '</xml>'
  ].join('');

  return _.template(tpl)(info);
};

//测试编码/解码
describe('xml2json', function(){
  beforeEach(function(){
    webot = new WeBot();
    bodyParser = webot.bodyParser();
    mockReq = {
      setEncoding: emptyFn,
      wx_data: null,
      on: emptyFn
    };
  });

  it('should return correct text json', function(){
    var info = {
      type: 'text',
      text: 'hi'
    };
    mockReq.on = function(e, cb){
      if(e == 'data'){
        cb(getXML(info));
      }else if(e == 'end'){
        cb();
      }
    };
    bodyParser(mockReq, mockRes, function(err){
      should.exist(mockReq.wx_data);
      should.equal(mockReq.wx_data.ToUserName.toString(), info.sp);
      should.equal(mockReq.wx_data.FromUserName.toString(), info.user);
      should.equal(mockReq.wx_data.MsgType.toString(), info.type);
      should.equal(mockReq.wx_data.Content.toString(), info.text);
    });
  });

  it('should return correct location json', function(){
    var info = {
      type: 'location',
      xPos: '23.08',
      yPos: '113.24',
      scale: '20',
      label: 'this is a location'
    };
    mockReq.on = function(e, cb){
      if(e == 'data'){
        cb(getXML(info));
      }else if(e == 'end'){
        cb();
      }
    };
    bodyParser(mockReq, mockRes, function(err){
      should.exist(mockReq.wx_data);
      should.equal(mockReq.wx_data.ToUserName.toString(), info.sp);
      should.equal(mockReq.wx_data.FromUserName.toString(), info.user);
      should.equal(mockReq.wx_data.MsgType.toString(), info.type);
      should.equal(mockReq.wx_data.Location_X.toString(), info.xPos);
      should.equal(mockReq.wx_data.Location_Y.toString(), info.yPos);
      should.equal(mockReq.wx_data.Scale.toString(), info.scale);
      should.equal(mockReq.wx_data.Label.toString(), info.label);
    });
  });

  it('should return correct image json', function(){
    var info = {
      type: 'image',
      pic: 'http://server/pic'
    };
    mockReq.on = function(e, cb){
      if(e == 'data'){
        cb(getXML(info));
      }else if(e == 'end'){
        cb();
      }
    };
    bodyParser(mockReq, mockRes, function(err){
      should.exist(mockReq.wx_data);
      should.equal(mockReq.wx_data.ToUserName.toString(), info.sp);
      should.equal(mockReq.wx_data.FromUserName.toString(), info.user);
      should.equal(mockReq.wx_data.MsgType.toString(), info.type);
      should.equal(mockReq.wx_data.PicUrl.toString(), info.pic);
    });
  });

  it('should return parser error', function(){
    mockReq.on = function(e, cb){
      cb();
    };
    bodyParser(mockReq, mockRes, function(err){
      should.exist(err);
    });
  });

});
