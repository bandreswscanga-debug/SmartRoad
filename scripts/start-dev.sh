#!/usr/bin/env bash
# Arranca el backend (puerto 4000) y el panel web (puerto 5173).
# Uso: ./scripts/start-dev.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG_DIR="${TMPDIR:-/tmp}/smartroad-sos"
mkdir -p "$LOG_DIR"

if curl -sf "http://localhost:4000/api/health" >/dev/null 2>&1; then
  echo "✔ Backend ya está corriendo en http://localhost:4000"
else
  echo "▶ Iniciando backend..."
  (cd "$ROOT/backend" && nohup pnpm start >"$LOG_DIR/backend.log" 2>&1 &)
fi

if curl -sf "http://localhost:5173" >/dev/null 2>&1; then
  echo "✔ Panel web ya está corriendo en http://localhost:5173"
else
  echo "▶ Iniciando panel web..."
  (cd "$ROOT/web" && nohup pnpm dev --host 0.0.0.0 >"$LOG_DIR/web.log" 2>&1 &)
fi

for _ in $(seq 1 30); do
  if curl -sf "http://localhost:4000/api/health" >/dev/null 2>&1; then break; fi
  sleep 1
done

echo
echo "SmartRoad S.O.S listo:"
echo "  Panel web : http://localhost:5173"
echo "  Panel/API : http://localhost:4000  (Swagger: /api/docs)"
echo "  Health    : http://localhost:4000/api/health"
echo
echo "  Admin demo: bandreswscanga@hgmail.com / 5304566767"
echo "  Logs      : $LOG_DIR/backend.log · $LOG_DIR/web.log"
