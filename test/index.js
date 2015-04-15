require('should');

var request = require('supertest');
var template = require('./support').template;
var tail = require('./support').tail;

var connect = require('connect');
var webot = require('../');

connect.query = require('connect-query');

describe('weixin.js', function () {
  describe('watch option', function () {
    var app;
    before(function () {
      app = connect();
      app.use(connect.query());

      // 指定回复消息
      webot.set('hi', '你好');
      webot.set('news', { url: 'http://example.com', title: 'Good job, your grace!' });
      // 回复音乐消息
      webot.set('music', { type: 'music', url: 'http://example.com' });
      // 收到地理位置消息
      webot.set(function is_location(info) {
        return info.is('location');
      }, function(info) {
        return JSON.stringify(info.param);
      });
      // 收到语音消息
      webot.set(function(info) {
        return info.is('voice');
      }, function(info) {
        return info.param.recognition + info.text;
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
          if (err) {
            console.log(res.text)
            return done(err);
          }
          var body = res.text.toString();
          body.should.containEql('<ToUserName><![CDATA[diaosi]]></ToUserName>');
          body.should.containEql('<FromUserName><![CDATA[nvshen]]></FromUserName>');
          body.should.match(/<CreateTime>\d{10}<\/CreateTime>/);
          body.should.containEql('<MsgType><![CDATA[text]]></MsgType>');
          body.should.containEql('<Content><![CDATA[你好]]></Content>');
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
          body.should.containEql('<MsgType><![CDATA[news]]></MsgType>');
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
          body.should.containEql('<MsgType><![CDATA[music]]></MsgType>');
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
          label: "Yaan"
        };

        var param = {
          lat: '100',
          lng: '30',
          scale: '15',
          label: "Yaan"
        };

        request(app)
        .post('/' + tail('your1weixin2token'))
        .send(template(info))
        .expect(200)
        .end(function(err, res){
          if (err) return done(err);
          var body = res.text.toString();
          body.should.containEql('<Content><![CDATA[' + JSON.stringify(param) + ']]></Content>');
          done();
        });
      });
      it('should pass recognition to text', function(done) {
        var info = {
          sp: 'nvshen',
          user: 'diaosi',
          type: 'voice',
          mediaId: 'abced',
          format: 'amr',
          recognition: '这是文本'
        };

        request(app)
        .post('/' + tail('your1weixin2token'))
        .send(template(info))
        .expect(200)
        .end(function(err, res){
          if (err) return done(err);
          var body = res.text.toString();
          body.should.containEql('<Content><![CDATA[' + (info.recognition + info.recognition) + ']]></Content>');
          done();
        });
      });
    });
  });

  describe('watch path', function () {
    var app;
    before(function () {
      app = connect();
      app.use(connect.query());

      // 指定回复消息
      webot.set('hi', '你好');

      // 接管消息请求
      webot.watch(app, { token: 'your1weixin2token', path: '/wechat' });
    });

    describe('valid path', function () {
      it('should 401', function (done) {
        request(app)
        .get('/wechat')
        .expect(401)
        .expect('Invalid signature', done);
      });

      it('should 200', function (done) {
        request(app)
        .get('/wechat' + tail('your1weixin2token'))
        .expect(200)
        .expect('hehe', done);
      });
    });

    describe('invalid path', function () {
      it('should 404', function (done) {
        request(app)
        .get('/')
        .expect(404, done)
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
          body.should.containEql('<ToUserName><![CDATA[diaosi]]></ToUserName>');
          body.should.containEql('<FromUserName><![CDATA[nvshen]]></FromUserName>');
          body.should.match(/<CreateTime>\d{10}<\/CreateTime>/);
          body.should.containEql('<MsgType><![CDATA[text]]></MsgType>');
          body.should.containEql('<Content><![CDATA[你好]]></Content>');
          done();
        });
      });
    });
  });

  describe('ignore some types of message', function() {
    var app;
    before(function () {
      app = connect();
      app.use(connect.query());
      // 指定不回复的消息的类型
      webot.set('ignore', {
        pattern: function(info) {
         return !info.is('text');
        },
        handler: function(info) {
         info.noReply = true;
         return;
        }
     });

      // 接管消息请求
      webot.watch(app, 'your1weixin2token');
    });

    describe('ignore no text type message', function(done) {
      it('should be empty', function (done) {
        var info = {
          sp: 'test',
          user: 'test',
          type: 'voice',
          mediaId: '123',
          format: 'mp3'
        };
        request(app)
        .post('/' + tail('your1weixin2token'))
        .send(template(info))
        .expect(200)
        .end(function(err, res){
          if (err) {
            return done(err);
          }
          var body = res.text.toString();
          body.should.equal('');
          done();
        });
      });
    });
  });
});
