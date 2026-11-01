#!/bin/bash
# FinScope AI — Quick Start Script
# Usage: chmod +x start.sh && ./start.sh

set -e

echo "══════════════════════════════════════"
echo "  FinScope AI — Multi-Agent Financial"
echo "  Document Analyst                    "
echo "══════════════════════════════════════"
echo ""

# Check prerequisites
command -v python3 >/dev/null 2>&1 || { echo "Python 3 is required. Install from python.org"; exit 1; }
command -v node >/dev/null 2>&1 || { echo "Node.js is required. Install from nodejs.org"; exit 1; }

# Check for API key
if [ -z "$GEMINI_API_KEY" ]; then
  if [ -f backend/.env ]; then
    export $(cat backend/.env | grep -v '^#' | xargs)
  fi
  if [ -z "$GEMINI_API_KEY" ]; then
    echo "⚠ GEMINI_API_KEY not set!"
    echo "  Get a free key from: https://aistudio.google.com/apikey"
    echo "  Then run: export GEMINI_API_KEY=your-key-here"
    echo ""
    read -p "Enter your Gemini API key (or press Enter to skip): " key
    if [ -n "$key" ]; then
      export GEMINI_API_KEY=$key
      echo "GEMINI_API_KEY=$key" > backend/.env
    fi
  fi
fi

echo ""
echo "[1/4] Installing backend dependencies..."
cd backend
pip install -r requirements.txt -q 2>/dev/null || pip install -r requirements.txt --break-system-packages -q
cd ..

echo "[2/4] Installing frontend dependencies..."
cd frontend
npm install --silent 2>/dev/null || npm install
cd ..

echo "[3/4] Starting backend (FastAPI on port 8000)..."
cd backend
python3 -m uvicorn main:app --reload --port 8000 &
BACKEND_PID=$!
cd ..

echo "[4/4] Starting frontend (Vite on port 5173)..."
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo "══════════════════════════════════════"
echo "  FinScope AI is running!"
echo ""
echo "  Frontend: http://localhost:5173"
echo "  Backend:  http://localhost:8000"
echo "  API Docs: http://localhost:8000/docs"
echo ""
echo "  Press Ctrl+C to stop both servers"
echo "══════════════════════════════════════"

# Cleanup on exit
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo 'Servers stopped.'" EXIT

wait
