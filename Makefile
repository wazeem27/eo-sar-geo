COMPOSE_FILE = docker-compose.yml

# Default command when you just type `make`
all: up

up:
	docker-compose -f ${COMPOSE_FILE} up --build -d

down:
	docker-compose -f ${COMPOSE_FILE} down

build:
	docker-compose -f ${COMPOSE_FILE} build

rebuild:
	make down
	make up

ps:
	docker-compose -f ${COMPOSE_FILE} ps

logs:
	docker-compose -f ${COMPOSE_FILE} logs -f

clean:
	docker-compose -f ${COMPOSE_FILE} down --rmi all --volumes

.PHONY: all up down build rebuild ps logs clean
