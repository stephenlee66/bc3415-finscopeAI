"""
FinScope AI — Configuration
"""
import os
from pathlib import Path

# ─── Paths ───
BASE_DIR = Path(__file__).parent
UPLOAD_DIR = BASE_DIR / "uploads"
SAMPLE_DATA_DIR = BASE_DIR / "sample_data"
CHROMA_DIR = BASE_DIR / "chroma_db"
REGISTRY_FILE = BASE_DIR / "document_registry.json"

UPLOAD_DIR.mkdir(exist_ok=True)
CHROMA_DIR.mkdir(exist_ok=True)

# ─── LLM ───
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL = "gemini-3-flash-preview"

# ─── Retry / Rate Limit ───
MAX_RETRIES = 3
RETRY_DELAY_BASE = 5   # seconds, exponential backoff
MAX_FILE_SIZE_MB = 20

# ─── Embeddings ───
EMBEDDING_MODEL = "all-MiniLM-L6-v2"

# ─── RAG ───
CHUNK_SIZE = 500
CHUNK_OVERLAP = 50
TOP_K_RESULTS = 8

# ─── ChromaDB ───
COLLECTION_NAME = "financial_documents"

# ─── CORS ───
ALLOWED_ORIGINS = ["*"]  # Allow all origins for dev simplicity
