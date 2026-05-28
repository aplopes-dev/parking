#!/bin/sh
# Sobe API no Docker com volume ./backend:/app (sem nest --watch no dist/).
set -e

cd /app

echo "[food_backend] Instalando dependências (dev + prod para compilar)..."
# Compose define NODE_ENV=production; sem isso o @nestjs/cli não entra no node_modules do volume.
NODE_ENV=development npm install --no-audit --no-fund

if [ ! -x node_modules/.bin/nest ]; then
  echo "[food_backend] ERRO: nest CLI ausente. Recrie o volume: docker compose down -v && docker compose up -d --build"
  exit 1
fi

echo "[food_backend] Rodando migrations..."
npm run migration:run

echo "[food_backend] Compilando..."
node_modules/.bin/nest build

if [ ! -f dist/main.js ]; then
  echo "[food_backend] ERRO: dist/main.js não gerado após o build"
  exit 1
fi

echo "[food_backend] Iniciando (node dist/main.js)..."
exec node dist/main.js
