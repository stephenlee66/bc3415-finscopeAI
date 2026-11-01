
#!/bin/bash
# FinScope AI — Quick Start Script
# Usage: chmod +x start.sh && ./start.sh
# Supports macOS and Linux

set -e

# Always run from the project directory
cd "$(dirname "$0")"
PROJECT_DIR="$(pwd)"

BACKEND_PID=""
FRONTEND_PID=""

cleanup() {
    echo ""
    echo "Stopping FinScope AI..."

    if [ -n "$BACKEND_PID" ]; then
        kill "$BACKEND_PID" 2>/dev/null || true
        pkill -P "$BACKEND_PID" 2>/dev/null || true
    fi

    if [ -n "$FRONTEND_PID" ]; then
        kill "$FRONTEND_PID" 2>/dev/null || true
        pkill -P "$FRONTEND_PID" 2>/dev/null || true
    fi

    echo "Servers stopped."
}

trap cleanup EXIT

echo "══════════════════════════════════════"
echo "  FinScope AI — Multi-Agent Financial"
echo "  Document Analyst"
echo "══════════════════════════════════════"
echo ""

# Check prerequisites
command -v python3 >/dev/null 2>&1 || {
    echo "ERROR: Python 3 is required."
    exit 1
}

command -v npm >/dev/null 2>&1 || {
    echo "ERROR: Node.js and npm are required."
    exit 1
}

# Create isolated Python environment
echo "[1/4] Setting up Python environment..."

if [ ! -f "$PROJECT_DIR/.venv/bin/python" ]; then
    python3 -m venv "$PROJECT_DIR/.venv"
fi

PYTHON="$PROJECT_DIR/.venv/bin/python"

# Check Python version (3.11–3.13)
"$PYTHON" -c '
import sys
if not ((3, 11) <= sys.version_info[:2] <= (3, 13)):
    sys.exit("ERROR: Python 3.11–3.13 is recommended for this project.")
'

echo "Using $("$PYTHON" --version)"

# Install backend dependencies
echo ""
echo "[2/4] Installing backend dependencies..."

"$PYTHON" -m pip install -r backend/requirements.txt

# Install frontend dependencies
echo ""
echo "[3/4] Installing frontend dependencies..."

cd "$PROJECT_DIR/frontend"

if [ -f package-lock.json ]; then
    npm ci
else
    npm install
fi

cd "$PROJECT_DIR"

# Load Gemini API key
if [ -f "$PROJECT_DIR/backend/.env" ]; then
    set -a
    source "$PROJECT_DIR/backend/.env"
    set +a
fi

if [ -z "${GEMINI_API_KEY:-}" ]; then
    echo ""
    echo "WARNING: GEMINI_API_KEY is not configured."
    echo "Get your key at https://aistudio.google.com/apikey"

    read -r -p "Enter Gemini API key (or Enter to skip): " key

    if [ -n "$key" ]; then
        export GEMINI_API_KEY="$key"
        printf 'GEMINI_API_KEY=%s\n' "$key" > "$PROJECT_DIR/backend/.env"
        chmod 600 "$PROJECT_DIR/backend/.env"
    fi
fi

# Start FastAPI backend
echo ""
echo "[4/4] Starting FinScope AI..."

cd "$PROJECT_DIR/backend"

"$PYTHON" -m uvicorn main:app \
    --reload \
    --port 8000 &

BACKEND_PID=$!

# Start Vite frontend
cd "$PROJECT_DIR/frontend"

npm run dev &
FRONTEND_PID=$!

cd "$PROJECT_DIR"

echo ""
echo "══════════════════════════════════════"
echo "  FinScope AI launch commands started"
echo ""
echo "  Frontend: http://localhost:5173"
echo "  Backend:  http://localhost:8000"
echo "  API Docs: http://localhost:8000/docs"
echo ""
echo "  Press Ctrl+C to stop both servers"
echo "══════════════════════════════════════"

wait