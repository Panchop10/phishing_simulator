.PHONY: up down logs dev build clean

up: ## Levanta app + base de datos (producción local)
	./start.sh

dev: ## Igual que up pero con Mailpit (captura de correo en http://localhost:8025)
	docker compose up -d --build

down: ## Detiene los contenedores
	docker compose down

logs: ## Sigue los registros de la app
	docker compose logs -f app

clean: ## Detiene y borra volúmenes (¡borra la base de datos!)
	docker compose down -v

seed: ## Carga datos de ejemplo (plantillas + campañas con resultados ficticios)
	docker compose exec -T app node scripts/seed-demo.mjs
