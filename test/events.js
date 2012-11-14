var fs = require('fs');

var bootstrap = require('./bootstrap');
var should = bootstrap.should;
var xml2json = bootstrap.xml2json;
var makeQ = bootstrap.makeAuthQuery;
var request = bootstrap.request;
var conf = bootstrap.conf;
var messages = bootstrap.messages;

describe('Events', function() {
  var text_msg = fs.readFileSync(__dirname + '/wx_text.xml', 'utf-8');
  var geo_msg = fs.readFileSync(__dirname + '/wx_geo.xml', 'utf-8');

  describe('text "北京本周展览活动"', function() {
    var xml;
    before(function(done) {
      var req = request.build('POST /', makeQ(), function(err, ret) {
        xml = JSON.parse(xml2json.toJson(ret)).xml;
        done();
      });
      req.write(text_msg.replace('{text}', '北京本周展览活动'));
      req.end();
    });
    it('should have articles', function() {
      xml.ArticleCount.should.above(0);
    });
    it('articles length should match ArticleCount', function() {
      xml.ArticleCount.should.equal(xml.Articles.item.length);
    });
  });
  describe('text "西藏昌都音乐节"', function() {
    var xml;
    before(function(done) {
      var req = request.build('POST /', makeQ(), function(err, ret) {
        xml = JSON.parse(xml2json.toJson(ret)).xml;
        done();
      });
      req.write(text_msg.replace('{text}', '西藏昌都音乐节'));
      req.end();
    });
    it('should tip 404', function() {
      xml.Type.should.be('text');
      xml.Content.should.equal(messages['404']);
    });
  });
  describe('text "北京月抛"', function() {
    var xml;
    before(function(done) {
      var req = request.build('POST /', makeQ(), function(err, ret) {
        xml = JSON.parse(xml2json.toJson(ret)).xml;
        done();
      });
      req.write(text_msg.replace('{text}', '北京月抛'));
      req.end();
    });
    it('should tip unknown type', function() {
      should.exist(xml.content);
      xml.Type.should.be('text');
      xml.Content.should.equal(messages['UNKNOWN_TYPE']);
    });
  });
  describe('text "你叫什么名字"', function() {
    var xml;
    before(function(done) {
      var req = request.build('POST /', makeQ(), function(err, ret) {
        xml = JSON.parse(xml2json.toJson(ret)).xml;
        done();
      });
      req.write(text_msg.replace('{text}', '你叫什么名字'));
      req.end();
    });
    it('should tip 400', function() {
      should.exist(xml.content);
      xml.Content.should.equal(messages['400'])
    });
  });

  describe('send a geo in Guangzhou', function() {
    var xml;
    before(function(done) {
      var req = request.build('POST /', makeQ(), function(err, ret) {
        xml = JSON.parse(xml2json.toJson(ret)).xml;
        done();
      });
      req.write(geo_msg);
      req.end();
    });
    it('should have articles', function() {
      xml.ArticleCount.should.above(0);
    });
  });
});

