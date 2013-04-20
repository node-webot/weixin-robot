clear:
	@clear

start:
	@npm start

authors:
	@git log --format='%aN <%aE>' | sort -u > AUTHORS

test: clear
	@cd examples && export DEBUG= && mocha
