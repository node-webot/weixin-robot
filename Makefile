TESTS = test/*.js
REPORTER = spec
TIMEOUT = 10000
JSCOVERAGE = ./node_modules/jscover/bin/jscover

authors:
	@git log --format='%aN <%aE>' | sort -u > AUTHORS

test:
	@NODE_ENV=test ./node_modules/mocha/bin/mocha \
		--reporter $(REPORTER) \
		--timeout $(TIMEOUT) \
		$(TESTS)

test-cov: lib-cov
	@NODE_WEBOT_COV=1 $(MAKE) test REPORTER=dot
	@NODE_WEBOT_COV=1 $(MAKE) test REPORTER=html-cov > coverage.html

lib-cov:
	@rm -rf $@
	@$(JSCOVERAGE) lib $@

.PHONY: clear test test-cov lib-cov
