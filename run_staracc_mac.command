#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

if ! command -v docker >/dev/null 2>&1; then
  echo "❌ Docker is required but was not found. Install Docker Desktop for Mac and try again."
  exit 1
fi

if [ ! -f .env ] && [ -f .env.example ]; then
  cp .env.example .env
  echo "ℹ️ Created .env from .env.example"
fi

echo "🚀 Starting StarAcc services (db + api) with Docker Compose..."
docker compose up --build -d db api

echo
echo "✅ StarAcc is starting in the background."
echo "   API: http://localhost:8000"
echo "   API docs: http://localhost:8000/docs"
echo
echo "Useful commands:"
echo "  Stop services: docker compose down"
echo "  View logs:     docker compose logs -f api"
