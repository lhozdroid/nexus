.DEFAULT_GOAL := help

NEXUS ?= node bin/nexus

.PHONY: help install init run doctor test

help:
	@printf '%s\n' \
		'Usage: make <target>' \
		'' \
		'help    Show this help' \
		'install Install the local OpenCode dependencies' \
		'init    Install the Nexus profile into TARGET (default: .)' \
		'run     Start OpenCode with autonomous permissions' \
		'doctor  Validate the installed profile' \
		'test    Run the automated tests'

install:
	npm install --prefix .opencode

init:
	$(NEXUS) init $(TARGET)

run:
	$(NEXUS) run $(ARGS)

doctor:
	$(NEXUS) doctor $(TARGET)

test:
	npm test
