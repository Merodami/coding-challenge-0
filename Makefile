# Fever Event Service Makefile
# One command to setup, one command to run - that's it!

.PHONY: setup run stop clean clean-build clean-all help

# Colors for output
RED := \033[0;31m
GREEN := \033[0;32m
YELLOW := \033[0;33m
BLUE := \033[0;34m
NC := \033[0m # No Color

# Default target
help:
	@echo "$(BLUE)Fever Event Service - Simple Commands$(NC)"
	@echo ""
	@echo "$(GREEN)  make setup$(NC)      - Complete setup from scratch (install, docker, db, build)"
	@echo "$(GREEN)  make run$(NC)        - Run the application (starts everything)"
	@echo "$(YELLOW)  make stop$(NC)       - Stop services (keeps code intact)"
	@echo "$(YELLOW)  make clean$(NC)      - Clean build artifacts and stop services"
	@echo "$(RED)  make clean-all$(NC)  - Nuclear option: removes everything including dependencies"
	@echo ""

# MAIN SETUP - This does EVERYTHING from scratch
setup: clean-all
	@echo "$(BLUE)━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━$(NC)"
	@echo "$(BLUE)Starting Complete Setup from Clean Slate$(NC)"
	@echo "$(BLUE)━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━$(NC)"
	
	@echo "\n$(YELLOW)Step 1/8: Setting up environment variables...$(NC)"
	@if [ ! -f .env ]; then \
		echo "Creating .env file from .env.example..."; \
		cp .env.example .env; \
		echo "$(GREEN)✓ Created .env file with default PoC values$(NC)"; \
	else \
		echo "$(GREEN)✓ .env file already exists$(NC)"; \
	fi
	
	@echo "\n$(YELLOW)Step 2/8: Installing dependencies...$(NC)"
	@yarn install --immutable || (echo "$(RED)Failed to install dependencies$(NC)" && exit 1)
	
	@echo "\n$(YELLOW)Step 3/8: Starting Docker containers...$(NC)"
	@docker-compose -f docker-compose.local.yml up -d --quiet-pull || (echo "$(RED)Failed to start Docker$(NC)" && exit 1)
	
	@echo "\n$(YELLOW)Step 4/8: Waiting for services to be ready...$(NC)"
	@sleep 5
	@until docker exec fever_postgres pg_isready -U fever -d fever_events > /dev/null 2>&1; do \
		echo "Waiting for PostgreSQL..."; \
		sleep 2; \
	done
	@until docker exec fever_redis redis-cli ping > /dev/null 2>&1; do \
		echo "Waiting for Redis..."; \
		sleep 2; \
	done
	@echo "$(GREEN)✓ Services are ready$(NC)"
	
	@echo "\n$(YELLOW)Step 5/8: Generating Prisma client...$(NC)"
	@yarn db:generate || (echo "$(RED)Failed to generate Prisma client$(NC)" && exit 1)
	
	@echo "\n$(YELLOW)Step 6/8: Running database migrations...$(NC)"
	@cd packages/database && npx dotenv -e ../../.env -- npx prisma migrate deploy || \
		(echo "$(YELLOW)Migration deployment failed, attempting to resolve...$(NC)" && \
		npx dotenv -e ../../.env -- npx prisma migrate resolve --applied "20250817014247_initial" 2>/dev/null || \
		npx dotenv -e ../../.env -- npx prisma migrate dev --name initial --skip-seed) || \
		(echo "$(RED)Failed to setup migrations$(NC)" && exit 1)
	
	@echo "\n$(YELLOW)Step 7/8: Building all packages...$(NC)"
	@yarn build || (echo "$(RED)Failed to build packages$(NC)" && exit 1)
	
	@echo "\n$(YELLOW)Step 8/8: Generating API documentation...$(NC)"
	@yarn generate:api || true
	@yarn generate:docs || true
	
	@echo "\n$(GREEN)━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━$(NC)"
	@echo "$(GREEN)✅ Setup Complete!$(NC)"
	@echo "$(GREEN)━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━$(NC)"
	@echo ""
	@echo "Services running at:"
	@echo "  $(BLUE)• API Gateway:$(NC)      http://localhost:5500"
	@echo "  $(BLUE)• Event Service:$(NC)    http://localhost:5501"
	@echo "  $(BLUE)• PostgreSQL:$(NC)       localhost:5435"
	@echo "  $(BLUE)• Redis:$(NC)            localhost:6380"
	@echo "  $(BLUE)• Redis Commander:$(NC)  http://localhost:8081"
	@echo ""
	@echo "$(YELLOW)Opening API documentation...$(NC)"
	@yarn open:docs || true
	@echo ""
	@echo "$(GREEN)Run 'make run' to start the application$(NC)"

# MAIN RUN - Start everything
run:
	@echo "$(BLUE)━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━$(NC)"
	@echo "$(BLUE)Starting Fever Event Service$(NC)"
	@echo "$(BLUE)━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━$(NC)"
	
	@echo "\n$(YELLOW)Checking environment...$(NC)"
	@if [ ! -f .env ]; then \
		echo "$(YELLOW)Creating .env file from .env.example...$(NC)"; \
		cp .env.example .env; \
		echo "$(GREEN)✓ Created .env file with default PoC values$(NC)"; \
	fi
	
	@echo "\n$(YELLOW)Checking dependencies...$(NC)"
	@if [ ! -d "node_modules" ] || [ ! -f ".yarn/install-state.gz" ]; then \
		echo "$(YELLOW)Dependencies not installed, running yarn install...$(NC)"; \
		yarn install --immutable || (echo "$(RED)Failed to install dependencies$(NC)" && exit 1); \
	fi
	
	@echo "\n$(YELLOW)Checking Docker services...$(NC)"
	@docker-compose -f docker-compose.local.yml ps --quiet | grep -q . || \
		(echo "$(YELLOW)Docker not running, starting...$(NC)" && docker-compose -f docker-compose.local.yml up -d --quiet-pull)
	
	@echo "\n$(YELLOW)Waiting for services...$(NC)"
	@until docker exec fever_postgres pg_isready -U fever -d fever_events > /dev/null 2>&1; do \
		echo "Waiting for PostgreSQL..."; \
		sleep 2; \
	done
	@until docker exec fever_redis redis-cli ping > /dev/null 2>&1; do \
		echo "Waiting for Redis..."; \
		sleep 2; \
	done
	
	@echo "\n$(GREEN)Services ready! Starting application...$(NC)"
	@echo "$(BLUE)━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━$(NC)"
	@echo ""
	@echo "$(GREEN)API Endpoints:$(NC)"
	@echo "  $(BLUE)GET$(NC)  http://localhost:5500/health"
	@echo "  $(BLUE)GET$(NC)  http://localhost:5500/api/v1/search?starts_at=2024-01-01&ends_at=2024-12-31"
	@echo ""
	@echo "$(YELLOW)Press Ctrl+C to stop$(NC)"
	@echo "$(BLUE)━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━$(NC)"
	@yarn local

# Stop services without cleaning code
stop:
	@echo "$(YELLOW)Stopping services...$(NC)"
	@docker-compose -f docker-compose.local.yml down 2>/dev/null || true
	@echo "$(GREEN)✓ Services stopped$(NC)"

# Clean build artifacts only
clean-build:
	@echo "$(YELLOW)Cleaning build artifacts...$(NC)"
	@rm -rf packages/*/dist dist 2>/dev/null || true
	@rm -rf .local coverage reports 2>/dev/null || true
	@echo "$(GREEN)✓ Build artifacts cleaned$(NC)"

# Clean everything for a fresh start
clean:
	@echo "$(YELLOW)Cleaning project...$(NC)"
	@docker-compose -f docker-compose.local.yml down 2>/dev/null || true
	@if [ -f ".yarn/install-state.gz" ] && [ -d "node_modules" ]; then \
		yarn reset:codebase 2>/dev/null || true; \
	fi
	@rm -rf packages/*/dist dist 2>/dev/null || true
	@rm -rf .local coverage reports 2>/dev/null || true
	@rm -rf .nx 2>/dev/null || true
	@echo "$(GREEN)✓ Clean complete$(NC)"

# Nuclear clean - removes EVERYTHING including dependencies
clean-all:
	@echo "$(YELLOW)Starting complete cleanup...$(NC)"
	@docker-compose -f docker-compose.local.yml down 2>/dev/null || true
	@echo "  $(GREEN)✓$(NC) Docker services stopped"
	@rm -rf packages/*/dist dist 2>/dev/null || true
	@rm -rf .local coverage reports 2>/dev/null || true
	@rm -rf .nx 2>/dev/null || true
	@echo "  $(GREEN)✓$(NC) Build artifacts removed"
	@rm -rf node_modules packages/*/node_modules 2>/dev/null || true
	@rm -rf .yarn/install-state.gz 2>/dev/null || true
	@echo "  $(GREEN)✓$(NC) Dependencies removed"
	@docker volume prune -f 2>/dev/null | grep -v "Total reclaimed space: 0B" || true
	@docker system prune -f 2>/dev/null | grep -v "Total reclaimed space: 0B" || true
	@echo "  $(GREEN)✓$(NC) Docker volumes cleaned"
	@echo "$(GREEN)━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━$(NC)"
	@echo "$(GREEN)✅ Everything cleaned successfully!$(NC)"
	@echo "$(GREEN)━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━$(NC)"

# Quick commands for development
.PHONY: docker-up docker-down docker-restart db-migrate db-seed db-reset test lint format validate build dev

docker-up:
	@docker-compose -f docker-compose.local.yml up -d --quiet-pull

docker-down:
	@docker-compose -f docker-compose.local.yml down

docker-restart:
	@$(MAKE) docker-down
	@$(MAKE) docker-up

db-migrate:
	@echo "$(YELLOW)Applying database migrations...$(NC)"
	@cd packages/database && yarn dotenv -e ../../.env -- yarn prisma migrate deploy || \
		(echo "$(YELLOW)Creating migrations if needed...$(NC)" && \
		yarn dotenv -e ../../.env -- yarn prisma migrate dev --skip-seed)

db-seed:
	@echo "$(YELLOW)Seeding database...$(NC)"
	@yarn db:seed

db-reset:
	@echo "$(YELLOW)Resetting database...$(NC)"
	@yarn db:migrate:reset

test:
	@yarn test

lint:
	@yarn lint

format:
	@yarn format

validate:
	@yarn validate:all

build:
	@yarn build

dev:
	@$(MAKE) run

# Status check
status:
	@echo "$(BLUE)Service Status:$(NC)"
	@docker-compose -f docker-compose.local.yml ps
	@echo ""
	@curl -s http://localhost:5500/health 2>/dev/null | jq '.' || echo "$(YELLOW)API not running$(NC)"

# Health check
health:
	@curl -s http://localhost:5500/health | jq '.' || echo "$(RED)Service not healthy$(NC)"