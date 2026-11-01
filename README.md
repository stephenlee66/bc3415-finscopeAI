# FinScope AI — Multi-Agent Financial Analysis System

A fullstack AI-powered financial document analysis system using **RAG (Retrieval-Augmented Generation)** and **Multi-Agent Architecture** with automatic anomaly detection.

BC3415 Group Project — Option A (Coding-Based Submission).

## Architecture

```
User uploads PDFs/CSVs
        ↓
   FastAPI Backend
        ↓
   Document Processing (RAG Pipeline)
   Parse → Chunk → Embed (sentence-transformers) → Store (ChromaDB)
        ↓
   LangChain Agent Orchestrator (keyword routing)
   ├── Extractor Agent — pulls exact data points with source citations
   ├── Auditor Agent — flags duplicates, anomalies, missing data
   └── Reporter Agent — generates executive summaries and recommendations
        ↓
   Google Gemini LLM
        ↓
   React Frontend (Dynamic Dashboard + Chat + File Upload)
```

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | React + Vite + Recharts | Dashboard, chat UI, file upload |
| Backend | Python FastAPI | REST API with persistent document registry |
| LLM | Google Gemini API | Agent reasoning and response generation |
| Embeddings | sentence-transformers (all-MiniLM-L6-v2) | Local vector embedding (384-dim) |
| Vector DB | ChromaDB | Vector storage and retrieval |
| Agent Framework | LangChain | Prompt chaining and agent orchestration |
| Doc Parsing | PyPDF2, pdfplumber, pandas | PDF/CSV/XLSX text extraction |
| Analytics | pandas | Auto-detects financial columns for dashboard |

## Quick Start

### Prerequisites
- Python 3.13.9
- Node.js 18+
- Google Gemini API Key (free from https://aistudio.google.com/apikey)

### Quick Setup

**No need to manually set up and run the backend and frontend in 2 separate terminals.**

```bash
cd finscope
chmod +x start.sh
./start.sh
```

### 1. Manual Backend Setup

```bash
cd backend
python3 -m venv venv
source venv/bin/activate          # Mac/Linux
# OR: venv\Scripts\activate       # Windows
pip install -r requirements.txt   # First time setup only

export GEMINI_API_KEY="your-key-here"
uvicorn main:app --reload --port 8000
```

### 2. Manual Frontend Setup (in a second terminal)

```bash
cd frontend
npm install                       # First time setup only
npm run dev
```

### 3. Open the App
Visit `http://localhost:5173`

### 4. Load Sample Data
1. Click the **Documents** tab
2. Click **"Load sample financial data (for demo)"**
3. Go to **Chat** tab and start asking questions

## Features

### Multi-Agent System
- **Extractor Agent**: Extracts exact financial data (amounts, dates, vendors, invoice numbers) with source citations and table formatting
- **Auditor Agent**: Cross-references documents to detect duplicates, anomalies, and missing data with severity levels and confidence scores
- **Reporter Agent**: Generates structured executive reports with key metrics, trends, and quantified recommendations
- **Orchestrator**: Routes queries to the right agent via weighted keyword matching (zero LLM calls consumed)

### RAG Pipeline
- PDF text extraction via PyPDF2 + pdfplumber (with table extraction)
- CSV/XLSX parsing via pandas with automatic column detection
- Recursive text chunking with overlap
- Embedding generation via sentence-transformers (all-MiniLM-L6-v2, runs locally)
- Vector storage and retrieval via ChromaDB

### Dynamic Dashboard
- **KPI cards**: Total amount, document count, anomalies detected, potential savings — all computed from actual uploaded data
- **Income tracking**: Total income and net cash flow when bank statements contain credits
- **Spending by category**: Auto-detected from document columns, rendered as bar charts
- **Monthly trend**: Area chart with spend vs income over time
- **Anomaly alerts**: Duplicate detection, unusual amounts (excludes payroll/rent false positives)
- **Empty state**: Shows guidance when no documents are loaded

### Production Features
- **Retry with exponential backoff**: Rate limit errors (429) auto-retry up to 3 times
- **Persistent document registry**: Survives server restarts (saved to JSON)
- **Duplicate sample detection**: Loading samples twice won't create duplicates
- **File size validation**: Rejects uploads over 20MB
- **Graceful error handling**: All agent errors return friendly user-facing messages
- **CORS configured**: Works with any frontend origin
- **Gemini 3.x compatibility**: Handles both string and list content block responses

## Sample Data

The `backend/sample_data/` folder contains 4 sample financial documents:
- `invoices.csv` — 8 invoices from various vendors (includes a duplicate for demo)
- `bank_statement_march.csv` — Full March 2025 bank statement with debits and credits
- `receipts.csv` — 10 employee expense receipts
- `invoice_techcorp_001.pdf` - Sample pdf invoice

## Project Structure

```
finscope/
├── backend/
│   ├── main.py                 # FastAPI server (8 endpoints, persistent registry)
│   ├── config.py               # Configuration (model, paths, retry settings)
│   ├── llm_service.py          # Gemini wrapper with retry + response parsing
│   ├── analytics.py            # Dynamic dashboard analytics engine
│   ├── requirements.txt        # Python dependencies
│   ├── rag/
│   │   ├── __init__.py
│   │   ├── loader.py           # PDF/CSV/XLSX document loading + text extraction
│   │   ├── chunker.py          # Recursive text chunking with overlap
│   │   ├── embedder.py         # sentence-transformers embedding (local, free)
│   │   └── retriever.py        # ChromaDB vector store + cosine similarity search
│   ├── agent/
│   │   ├── __init__.py
│   │   ├── orchestrator.py     # Keyword-based query router (no LLM call)
│   │   └── agents.py           # Extractor, Auditor, Reporter agents
│   └── sample_data/
│       ├── invoices.csv
│       ├── bank_statement_march.csv
│       ├── invoice_techcorp_001.pdf
│       └── receipts.csv
├── frontend/
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   └── src/
│       ├── main.jsx
│       ├── App.jsx             # Main layout with tabs + backend status
│       ├── api.js              # API service layer
│       ├── theme.js            # Design tokens (dark theme)
│       └── components/
│           ├── Dashboard.jsx   # Dynamic KPIs, charts, anomaly alerts
│           ├── ChatPanel.jsx   # Chat with agent badges + source citations
│           └── FileUpload.jsx  # Drag-drop upload + RAG pipeline status
└── README.md
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Health check |
| POST | `/api/upload` | Upload and process a document |
| POST | `/api/chat` | Send query to multi-agent system |
| GET | `/api/documents` | List all processed documents |
| DELETE | `/api/documents/{id}` | Remove a document |
| GET | `/api/dashboard` | Get dynamic analytics data |
| POST | `/api/load-samples` | Load sample data for demo |
| POST | `/api/reset` | Clear all data |

## Troubleshooting

| Problem | Solution |
|---------|----------|
| 503 high demand error | Change to different LLM model |
| "Backend offline" | Make sure backend is running: `uvicorn main:app --reload --port 8000` |
| 429 rate limit error | Wait 15-20 seconds. Space questions 12+ seconds apart. |
| pip install fails | Use a virtual environment: `python3 -m venv venv && source venv/bin/activate` |
| ModuleNotFoundError | Run `pip install -r requirements.txt` inside the activated venv |
| Chat returns empty | Load sample data first (Documents tab → Load sample data button) |
| NaN on dashboard | Update to latest version — all number displays have fallbacks |