LOG_FILE = ./tmp.log

nonce="19283749"
# token for test environment
token="keyboarddog"
timestamp=$(shell date +%s)
# how can this sort happen?
str_arr=$(sort $(nonce) $(timestamp) $(token))
str=$(subst $(eval) ,,$(str_arr))
sig=`md5 -qs $(str)`

TEST_URI="http://wx.kanfa.org/?signature=$(sig)&timestamp=$(timestamp)&nonce=$(nonce)"
TEST_URI_LOCAL="http://0.0.0.0:3000/?signature=$(sig)&timestamp=$(timestamp)&nonce=$(nonce)"

# interactive model
send: clear
	@read -p '输入要发送的文字：' txt;\
	xx=`cat ./test/wx_text.xml | sed s/{text}/$${txt}/`;\
	curl -d "$$xx" $(TEST_URI_LOCAL)
	@echo "\n"

clear:
	@clear

test: clear
	./node_modules/mocha/bin/mocha
	@echo "\n"

cov: lib-cov
	@EXPRESS_COV=1 $(MAKE) test REPORTER=html-cov > coverage.html
	@-rm -rf ../ll-cov

lib-cov:
	@jscoverage --exclude=.git --exclude=test --exclude=node_modules ./ ../ll-cov

.PHONY: test cov lib-cov
