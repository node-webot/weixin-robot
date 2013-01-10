clear:
	@clear

test: clear
	npm start
	./node_modules/mocha/bin/mocha
	@echo "\n"

