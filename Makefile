clear:
	@clear

start:
	@npm start

test: clear
	@export DEBUG= && mocha
