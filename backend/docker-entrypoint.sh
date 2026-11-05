#!/usr/bin/env bash
set -euo pipefail

# Esperar a que MySQL esté disponible
if [ -n "${MYSQL_URL:-}" ]; then
  echo "Esperando a MySQL en mysql:3306..."
  for i in $(seq 1 30); do
    if (echo > /dev/tcp/mysql/3306) 2>/dev/null; then
      echo "MySQL disponible."
      break
    fi
    echo "Intento $i/30: MySQL no disponible, reintentando en 2s..."
    sleep 2
  done

  echo "Aplicando esquema de base de datos..."
  pnpm --dir backend db:setup || true
fi

echo "Iniciando backend en puerto ${PORT:-4000}..."
exec node /app/backend/src/server.js
