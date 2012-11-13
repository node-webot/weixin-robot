LOG_FILE = ./tmp.log

nonce="1928374"
timestamp=`date +%s`
sig=`md5 -s $(str)`

TEST_TEXT_MSG = "@./test/wx_text.xml"
TEST_GEO_MSG = "@./test/wx_geo.xml"
TEST_EMPTY_MSG = "@./test/wx_geo.xml"
TEST_URI = "http://wx.kanfa.org/?signature=$(sig)&timestamp=$(timestamp)&nonce=$(nonce)"
TEST_URI_LOCAL = "http://0.0.0.0:3000/"

clear:
	@clear

t: clear test_text test_geo

test_text:
	curl -d $(TEST_TEXT_MSG) $(TEST_URI_LOCAL)
	@echo "\n"

test_geo:
	curl -d $(TEST_GEO_MSG) $(TEST_URI_LOCAL)
	@echo "\n"

req_remote: clear
	curl -d $(TEST_TEXT_MSG) $(TEST_URI)
	@echo "\n"
	@echo "\n"
	curl -d $(TEST_GEO_MSG) $(TEST_URI)
	@echo "\n"

test: clear
	./node_modules/mocha/bin/mocha
	@echo "\n"

cov: lib-cov
	@EXPRESS_COV=1 $(MAKE) test REPORTER=html-cov > coverage.html
	@-rm -rf ../ll-cov

lib-cov:
	@jscoverage --exclude=.git --exclude=test --exclude=node_modules ./ ../ll-cov

.PHONY: test cov lib-cov
