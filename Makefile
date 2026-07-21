.PHONY: help install dev build lint test test-e2e docker-build docker-up docker-down docker-logs docker-redeploy

# Environment variables with sensible defaults
NODE_ENV ?= local
VERSION ?= latest
COMPOSE := docker compose

# Ensure defaults when variables are empty
ifeq ($(NODE_ENV),)
  NODE_ENV := local
endif
ifeq ($(VERSION),)
  VERSION := latest
endif

help: ## Show this help message
	@echo "Usage: make [target]"
	@echo ""
	@echo "Targets:"
	@grep -E '^[a-zA-Z][a-zA-Z0-9_-]*:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

install: ## Install dependencies (npm ci)
	npm ci

dev: ## Start development server
	@export NODE_ENV=$(NODE_ENV); if which doppler >/dev/null 2>&1; then doppler run npm run start:dev; else echo "Warning: doppler not found, falling back to npm run start:dev"; npm run start:dev; fi

build: ## Build the project
	NODE_ENV=$(NODE_ENV) VERSION=$(VERSION) npm run build

lint: ## Run linter
	npm run lint

test: ## Run unit tests
	npm run test

test-e2e: ## Run end-to-end tests
	npm run test:e2e

docker-build: ## Build Docker images
	$(COMPOSE) build

docker-up: ## Start containers in detached mode
	$(COMPOSE) up -d

docker-down: ## Stop and remove containers
	$(COMPOSE) down

docker-logs: ## Follow container logs
	$(COMPOSE) logs -f

docker-redeploy: docker-down docker-build docker-up ## Down, rebuild, and restart containers
