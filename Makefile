clear:
	@clear

test: clear
	./node_modules/mocha/bin/mocha
	@echo "\n"

