clear:
	@clear

start:
	@npm start

test: clear
	./node_modules/mocha/bin/mocha
	@echo "\n"
