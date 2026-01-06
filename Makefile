.PHONY: help build up down restart logs clean frontend-install frontend-build

help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Available targets:'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-20s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

build: ## Build all Docker images
	docker compose build

up: ## Start all services
	docker compose up -d

down: ## Stop all services
	docker compose down

restart: ## Restart all services
	docker compose restart

logs: ## Show logs for all services
	docker compose logs -f

logs-frontend: ## Show logs for frontend only
	docker compose logs -f frontend

logs-api: ## Show logs for API only
	docker compose logs -f api

clean: ## Remove all containers, volumes, and images
	docker compose down -v --rmi all

frontend-install: ## Install frontend dependencies locally
	cd sentineliq-ui && npm install

frontend-build: ## Build frontend locally
	cd sentineliq-ui && npm run build

dev: ## Start development environment with rebuild
	docker compose up --build

prod: ## Build and run production frontend
	docker compose -f docker-compose.prod.yml up --build -d

shell-frontend: ## Open shell in frontend container
	docker compose exec frontend sh

shell-api: ## Open shell in API container
	docker compose exec api bash
