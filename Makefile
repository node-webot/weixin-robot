clear:
	@clear

start:
	@npm start

authors:
	@git log --format='%aN <%aE>' | sort -u > AUTHORS

test: clear
	@export DEBUG= && mocha
