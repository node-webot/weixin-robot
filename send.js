#!/usr/bin/env node

var color = require('color');
// Send test text message
var readline = require('readline');
var fs = require('fs');

var bootstrap = require('./test/bootstrap');
var makeQ = bootstrap.makeAuthQuery;
var request = bootstrap.request;
var xml2json = bootstrap.xml2json;

var rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

var text_msg = fs.readFileSync(__dirname + '/test/wx_text.xml', 'utf-8');

function run() {
  rl.question('The text: ', function(text) {
    var text = text || '北京本周展览活动';
    var req = request.build('POST /', makeQ(), function(err, ret) {
      console.log(ret);
      var xml = JSON.parse(xml2json.toJson(ret)).xml;
      if (err) throw err;
      console.log(xml);
      console.log('\n');
      run();
    });
    req.write(text_msg.replace('{text}', text));
    req.end();
  });
}

run();
