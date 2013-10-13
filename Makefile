REPORTER = spec
TIMEOUT = 100 
JSCOVERAGE = ./node_modules/jscover/bin/jscover

test:
	@DEBUG= NODE_ENV=test ./node_modules/mocha/bin/mocha \
		--reporter $(REPORTER) \
		--timeout $(TIMEOUT)

authors:
	@git log --format='%aN <%aE>' | sort -u > AUTHORS

cov: test-cov
	@open coverage.html

test-cov: lib-cov
	@NODE_WEBOT_COV=1 $(MAKE) test REPORTER=dot
	@NODE_WEBOT_COV=1 $(MAKE) test REPORTER=html-cov > coverage.html

lib-cov:
	@rm -rf $@
	@$(JSCOVERAGE) lib $@

.PHONY: clear test test-cov lib-cov
