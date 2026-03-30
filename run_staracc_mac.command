#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

if ! command -v docker >/dev/null 2>&1; then
  echo "❌ Docker is required but was not found. Install Docker Desktop for Mac and try again."
  exit 1
fi

if ! command -v node >/dev/null 2>&1; then
  echo "❌ Node.js is required for the frontend but was not found. Install Node.js and try again."
  exit 1
fi

if command -v pnpm >/dev/null 2>&1; then
  FRONTEND_PM="pnpm"
  INSTALL_CMD=(pnpm install)
  DEV_CMD=(pnpm dev)
elif command -v npm >/dev/null 2>&1; then
  FRONTEND_PM="npm"
  INSTALL_CMD=(npm install)
  DEV_CMD=(npm run dev)
else
  echo "❌ No JavaScript package manager found. Install pnpm (recommended) or npm and try again."
  exit 1
fi

if [ ! -f .env ] && [ -f .env.example ]; then
  cp .env.example .env
  echo "ℹ️ Created .env from .env.example"
fi

echo "🚀 Starting StarAcc backend + database (Docker Compose)..."
docker compose up --build -d db api

echo "🚀 Starting StarAcc frontend (Next.js) using $FRONTEND_PM..."
if [ ! -d frontend/node_modules ]; then
  echo "ℹ️ Installing frontend dependencies with $FRONTEND_PM..."
  (cd frontend && "${INSTALL_CMD[@]}")
fi

FRONTEND_LOG="$SCRIPT_DIR/frontend/frontend.dev.log"
FRONTEND_PID_FILE="$SCRIPT_DIR/frontend/.frontend-dev.pid"

if [ -f "$FRONTEND_PID_FILE" ] && kill -0 "$(cat "$FRONTEND_PID_FILE")" 2>/dev/null; then
  echo "ℹ️ Frontend is already running (PID $(cat "$FRONTEND_PID_FILE"))."
else
  (cd frontend && nohup "${DEV_CMD[@]}" > "$FRONTEND_LOG" 2>&1 & echo $! > "$FRONTEND_PID_FILE")
  echo "ℹ️ Frontend started in background with $FRONTEND_PM. Logs: $FRONTEND_LOG"
fi

echo
echo "✅ StarAcc full stack is starting in the background."
echo "   Frontend: http://localhost:3000"
echo "   API:      http://localhost:8000"
echo "   API docs: http://localhost:8000/docs"
echo
echo "Useful commands:"
echo "  Stop backend+db: docker compose down"
echo "  Stop frontend:   kill \"\$(cat frontend/.frontend-dev.pid)\" && rm -f frontend/.frontend-dev.pid"
echo "  API logs:        docker compose logs -f api"
echo "  Frontend logs:   tail -f frontend/frontend.dev.log"
