require('should');

var request = require('supertest');
var template = require('./support').template;
var tail = require('./support').tail;

var connect = require('connect');
var webot = require('../');

describe('weixin.js', function () {
  describe('watch option', function () {
    var app;
    before(function () {
      app = connect();
      app.use(connect.query());

      // 指定回复消息
      webot.set('hi', '你好');
      webot.set('news', { url: 'http://example.com', title: 'Good job, your grace!' });
      webot.set('music', { type: 'music', url: 'http://example.com' });
      webot.set(function is_location(info) {
        return info.is('location');
      }, function(info) {
        return JSON.stringify(info.param);
      });

      // 接管消息请求
      webot.watch(app, { token: 'your1weixin2token' });
    });

    describe('valid GET', function () {
      it('should 401', function (done) {
        request(app)
        .get('/')
        .expect(401)
        .expect('Invalid signature', done);
      });

      it('should 200', function (done) {
        request(app)
        .get('/' + tail('your1weixin2token'))
        .expect(200)
        .expect('hehe', done);
      });
    });

    describe('valid POST', function () {
      it('should 401', function (done) {
        request(app)
        .post('/')
        .expect(401)
        .expect('Invalid signature', done);
      });

      it('should 200', function (done) {
        var info = {
          sp: 'nvshen',
          user: 'diaosi',
          type: 'text',
          text: 'hi'
        };

        request(app)
        .post('/' + tail('your1weixin2token'))
        .send(template(info))
        .expect(200)
        .end(function(err, res){
          if (err) return done(err);
          var body = res.text.toString();
          body.should.include('<ToUserName><![CDATA[diaosi]]></ToUserName>');
          body.should.include('<FromUserName><![CDATA[nvshen]]></FromUserName>');
          body.should.match(/<CreateTime>\d{13}<\/CreateTime>/);
          body.should.include('<MsgType><![CDATA[text]]></MsgType>');
          body.should.include('<Content><![CDATA[你好]]></Content>');
          body.should.include('<FuncFlag>0</FuncFlag>');
          done();
        });
      });
    });

    describe('reply with Object', function () {
      it('should reply news', function (done) {
        var info = {
          sp: 'nvshen',
          user: 'diaosi',
          type: 'text',
          text: 'news'
        };

        request(app)
        .post('/' + tail('your1weixin2token'))
        .send(template(info))
        .expect(200)
        .end(function(err, res){
          if (err) return done(err);
          var body = res.text.toString();
          body.should.include('<MsgType><![CDATA[news]]></MsgType>');
          done();
        });
      });
      it('should reply music', function (done) {
        var info = {
          sp: 'nvshen',
          user: 'diaosi',
          type: 'text',
          text: 'music'
        };

        request(app)
        .post('/' + tail('your1weixin2token'))
        .send(template(info))
        .expect(200)
        .end(function(err, res){
          if (err) return done(err);
          var body = res.text.toString();
          body.should.include('<MsgType><![CDATA[music]]></MsgType>');
          done();
        });
      });
    });

    describe('extra param', function () {
      it('should in info.param', function (done) {
        var info = {
          sp: 'nvshen',
          user: 'diaosi',
          type: 'location',
          lat: '100',
          lng: '30',
          scale: '15',
          label: "Ya'an"
        };

        var param = {
          lat: '100',
          lng: '30',
          scale: '15',
          label: "Ya'an"
        };

        request(app)
        .post('/' + tail('your1weixin2token'))
        .send(template(info))
        .expect(200)
        .end(function(err, res){
          if (err) return done(err);
          var body = res.text.toString();
          body.should.include('<Content><![CDATA[' + JSON.stringify(param) + ']]></Content>');
          done();
        });
      });
    });
  });

  describe('watch string', function () {
    var app;
    before(function () {
      app = connect();
      app.use(connect.query());

      // 指定回复消息
      webot.set('hi', '你好');

      // 接管消息请求
      webot.watch(app, 'your1weixin2token');
    });

    describe('valid GET', function () {
      it('should 401', function (done) {
        request(app)
        .get('/')
        .expect(401)
        .expect('Invalid signature', done);
      });

      it('should 200', function (done) {
        request(app)
        .get('/' + tail('your1weixin2token'))
        .expect(200)
        .expect('hehe', done);
      });
    });

    describe('valid POST', function () {
      it('should 401', function (done) {
        request(app)
        .post('/')
        .expect(401)
        .expect('Invalid signature', done);
      });

      it('should 200', function (done) {
        var info = {
          sp: 'nvshen',
          user: 'diaosi',
          type: 'text',
          text: 'hi'
        };

        request(app)
        .post('/' + tail('your1weixin2token'))
        .send(template(info))
        .expect(200)
        .end(function(err, res){
          if (err) return done(err);
          var body = res.text.toString();
          body.should.include('<ToUserName><![CDATA[diaosi]]></ToUserName>');
          body.should.include('<FromUserName><![CDATA[nvshen]]></FromUserName>');
          body.should.match(/<CreateTime>\d{13}<\/CreateTime>/);
          body.should.include('<MsgType><![CDATA[text]]></MsgType>');
          body.should.include('<Content><![CDATA[你好]]></Content>');
          body.should.include('<FuncFlag>0</FuncFlag>');
          done();
        });
      });
    });
  });
});
