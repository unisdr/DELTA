# Makefile

# Default target when running `make`
.DEFAULT_GOAL := help

# Setting phony targets for Make commands
.PHONY: help build start stop restart rebuild down logs app-logs db-logs app-shell db-shell db-psql status migrate rollback tsc

# Show available commands
help:
	@echo "Available commands:"
	@echo "  make help      - Show this help message"
	@echo "  make status    - Show status of all containers"
	@echo "  make build     - Build Docker images"
	@echo "  make start     - Start services in the background"
	@echo "  make stop      - Stop running containers"
	@echo "  make restart   - Restart running services"
	@echo "  make rebuild   - Rebuild images and restart services"
	@echo "  make down      - Stop and remove containers and volumes"
	@echo "  make logs      - Follow service logs"
	@echo "  make app-logs  - Follow app service logs"
	@echo "  make db-logs   - Follow database service logs"
	@echo "  make app-shell - Open shell inside the app container"
	@echo "  make db-shell  - Open shell inside the database container"
	@echo "  make db-psql   - Open psql inside the database container"
	@echo "  make migrate   - Run database migrations"
	@echo "  make rollback  - Roll back database migrations"
	@echo "  make tsc       - Run TypeScript type checking"

# Show status of all containers
status:
	docker-compose ps

# Build the Docker images
build:
	docker-compose build

# Start all services in the background
start:
	docker-compose up -d

# Stop all running containers
stop:
	docker-compose stop

# Restart running services
restart:
	docker-compose restart

# Rebuild images and restart services
rebuild:
	docker-compose up -d --build

# Take down all containers and remove volumes
down:
	docker-compose down -v

# View logs for services
logs:
	docker-compose logs -f

# View logs for the app service
app-logs:
	docker-compose logs -f app

# View logs for the database service
db-logs:
	docker-compose logs -f db

# Open a shell inside the app container
app-shell:
	docker-compose exec app sh

# Open a shell inside the database container
db-shell:
	docker-compose exec db bash

# Open a PostgreSQL shell inside the database container
db-psql:
	docker-compose exec db sh -lc 'psql -U "$$POSTGRES_USER" -d "$$POSTGRES_DB"'

# Run database migrations (uses drizzle-kit migrate, not push — see _docs/code-structure/drizzle.md)
migrate:
	docker-compose exec app yarn dbsync

# Rollback database migrations
rollback:
	docker-compose exec app yarn run drizzle-kit rollback

# Run TypeScript type checking
tsc:
	docker-compose exec app yarn run tsc --noEmit
