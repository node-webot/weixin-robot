var should = require('should');

var bootstrap = require('../../bin/bootstrap.js');
var makeRequest = bootstrap.makeRequest;
var sendRequest = makeRequest('http://localhost:3000/weixin', 'keyboardcat123');
var app = require('../');

//公用检测指令
var detect = function(info, err, json, content){
  should.exist(info);
  should.not.exist(err);
  should.exist(json);
  json.should.be.a('object');
  if(content){
    json.should.have.property('Content');
    json.Content.should.match(content);
  }
};

//测试规则
describe('Rule', function(){
  //初始化
  var info = null;
  beforeEach(function(){
    info = {
      sp: 'webot',
      user: 'client',
      type: 'text'
    };
  });

  //测试文本消息
  describe('text', function(){
    //检测more指令
    it('should return more msg', function(done){
      info.text = 'more';
      sendRequest(info, function(err, json){
        detect(info, err, json, /可用的指令/ );
        done();
      });
    });

    //检测fn指令
    it('should return fn msg', function(done){
      info.text = 'fn';
      sendRequest(info, function(err, json){
        detect(info, err, json, /pattern支持函数/);
        done();
      });
    });

    //检测who指令
    it('should return who msg', function(done){
      info.text = 'who';
      sendRequest(info, function(err, json){
        detect(info, err, json, /机器人/);
        done();
      });
    });

    //检测name指令
    it('should return name msg', function(done){
      info.text = 'I am a mocha tester';
      sendRequest(info, function(err, json){
        detect(info, err, json, /a mocha tester/);
        done();
      });
    });

    //检测time指令
    it('should return time msg', function(done){
      info.text = '几点了';
      sendRequest(info, function(err, json){
        detect(info, err, json, /时间/);
        done();
      });
    });

    //检测不匹配指令
    it('should return not_match msg', function(done){
      info.text = '#$%^&!@#$';
      sendRequest(info, function(err, json){
        detect(info, err, json, /我太笨了/);
        done();
      });
    });
  });

  //测试dialog消息
  describe('dialog', function(){
    //检测key指令
    it('should return key msg', function(done){
      info.text = 'key aaaa';
      sendRequest(info, function(err, json){
        detect(info, err, json, /aaaa/);
        json.Content.should.not.match(/太笨了/);
        done();
      });
    });

    //检测hello指令
    it('should return hello msg', function(done){
      info.text = 'hello';
      sendRequest(info, function(err, json){
        detect(info, err, json, /你好|fine|(how are you)/);
        done();
      });
    });

    //检测yaml指令
    it('should return yaml msg', function(done){
      info.text = 'yaml';
      sendRequest(info, function(err, json){
        detect(info, err, json, /这是一个yaml的object配置/);
        done();
      });
    });
  });

  //测试wait
  describe('wait', function(){
    //检测sex指令
    it('should return ask_sex msg', function(done){
      info.text = 'sex';
      sendRequest(info, function(err, json){
        detect(info, err, json, /猜猜看/);
        //下次回复
        info.text = 'g';
        sendRequest(info, function(err, json){
          detect(info, err, json, /猜错/);
          done();
        });
      });
    });

    //检测game指令
    it('should return game-no-found msg', function(done){
      info.text = 'game 1';
      sendRequest(info, function(err, json){
        detect(info, err, json, /游戏/);
        info.text = '2';
        sendRequest(info, function(err, json){
          detect(info, err, json, /再猜/);
          info.text = '3';
          sendRequest(info, function(err, json){
            detect(info, err, json, /再猜/);
            info.text = '4';
            sendRequest(info, function(err, json){
              detect(info, err, json, /IQ/);
              done();
            });
          });
        });
      });
    });

    //检测game指令
    it('should return game-found msg', function(done){
      info.text = 'game 1';
      sendRequest(info, function(err, json){
        detect(info, err, json, /游戏/);
        info.text = '2';
        sendRequest(info, function(err, json){
          detect(info, err, json, /再猜/);
          info.text = '3';
          sendRequest(info, function(err, json){
            detect(info, err, json, /再猜/);
            info.text = '1';
            sendRequest(info, function(err, json){
              detect(info, err, json, /聪明/);
              done();
            });
          });
        });
      });
    });

    //检测suggest_keyword指令
    it('should return suggest_keyword msg', function(done){
      info.text = 's nde';
      sendRequest(info, function(err, json){
        detect(info, err, json,/拼写错误.*nodejs/);
        //下次回复
        info.text = 'y';
        sendRequest(info, function(err, json){
          detect(info, err, json, /百度搜索.*nodejs/);
          done();
        });
      });
    });

    //检测suggest_keyword指令
    it('should return suggest_keyword_not msg', function(done){
      info.text = 's nde';
      sendRequest(info, function(err, json){
        detect(info, err, json,/拼写错误.*nodejs/);
        //下次回复
        info.text = 'n';
        sendRequest(info, function(err, json){
          detect(info, err, json, /百度搜索.*nde/);
          done();
        });
      });
    });

    //检测search指令
    it('should return search msg', function(done){
      info.text = 's javascript';
      sendRequest(info, function(err, json){
        detect(info, err, json, /百度搜索.*javascript/);
        done();
      });
    });

    //检测timeout指令
    it('should return timeout_not msg', function(done){
      info.text = 'timeout';
      sendRequest(info, function(err, json){
        detect(info, err, json, /请等待/);
        setTimeout(function(){
          info.text = 'not timeout';
          sendRequest(info, function(err, json){
            detect(info, err, json, /规定时限/);
            done();
          });
        },2000);
      });
    });

    //检测timeout指令
    it('should return timeout msg', function(done){
      info.text = 'timeout';
      sendRequest(info, function(err, json){
        detect(info, err, json, /请等待/);
        setTimeout(function(){
          info.text = 'timeout ok';
          sendRequest(info, function(err, json){
            detect(info, err, json, /超时/);
            done();
          });
        },6000);
      });
    });
  });

  //测试地理位置
  describe('location', function(){
    //检测check_location指令
    it('should return check_location msg', function(done){
      info.type = 'location';
      info.xPos = '23.08';
      info.yPos = '113.24';
      sendRequest(info, function(err, json){
        detect(info, err, json, /广州/);
        done();
      });
    });
  });

  //测试图片
  describe('image', function(){
    //检测check_location指令
    it('should return image msg', function(done){
      info.type = 'image';
      sendRequest(info, function(err, json){
        detect(info, err, json, /图片/);
        var tmp = json.Content.match(/你的图片已经保存到:(.*)/);
        should.exist(tmp);
        done()
        // if(tmp && tmp.length>=2){
        //   var fs = require('fs');
        //   var exists = fs.existsSync(tmp[1].replace(/\\\\/,'\\'));
        //   console.log(exists, tmp[1].replace(/\\\\/,'\\'))
        //   if(exists){
        //     fs.unlinkSync(tmp[1]);
        //     done();
        //   }else{
        //     done('download fail: ' + tmp[1]);
        //   }
        // }else{
        //    done();
        // }
      });
    });
  });

  //测试图文消息
  describe('news', function(){
    //检测首次收听指令
    it('should return first msg', function(done){
      info.text = 'Hello2BizUser';
      sendRequest(info, function(err, json){
        detect(info, err, json);
        json.should.have.property('MsgType', 'news');
        json.Articles.item.should.have.length(json.ArticleCount);
        json.Articles.item[0].Title[0].toString().should.match(/感谢你收听/);
        done();
      });
    });

    //检测image指令
    it('should return news msg', function(done){
      info.text = 'news';
      sendRequest(info, function(err, json){
        detect(info, err, json);
        json.should.have.property('MsgType', 'news');
        json.Articles.item.should.have.length(json.ArticleCount);
        json.Articles.item[0].Title[0].toString().should.match(/微信机器人/);
        done();
      });
    });
  });
});