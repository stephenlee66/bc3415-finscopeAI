"""
FinScope AI — FastAPI Backend Server (Production)

Features:
    - Persistent document registry (survives restarts)
    - File size validation
    - Graceful error handling throughout
    - Dynamic analytics dashboard
    - CORS configured for any origin

Endpoints:
    POST /api/upload          Upload and process a financial document
    POST /api/chat            Send a query to the multi-agent system
    GET  /api/documents       List all processed documents
    DELETE /api/documents/{id} Remove a document
    GET  /api/stats           Get basic stats
    GET  /api/dashboard       Get dynamic dashboard analytics
    POST /api/load-samples    Load sample data for demo
    POST /api/reset           Clear all data
"""
import os
import json
import uuid
import shutil
import logging
from pathlib import Path
from datetime import datetime

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional

from config import (
    ALLOWED_ORIGINS, UPLOAD_DIR, SAMPLE_DATA_DIR,
    REGISTRY_FILE, MAX_FILE_SIZE_MB,
)
from rag.loader import loader
from rag.chunker import chunker
from rag.retriever import retriever
from analytics import generate_dashboard_data

# ─── Logging ───
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("finscope")

# ─── App Setup ───
app = FastAPI(
    title="FinScope AI",
    description="Multi-Agent Financial Document Analyst with RAG",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Persistent Document Registry ───
def _load_registry() -> dict:
    """Load document registry from disk."""
    if REGISTRY_FILE.exists():
        try:
            with open(REGISTRY_FILE, "r") as f:
                return json.load(f)
        except (json.JSONDecodeError, IOError):
            return {}
    return {}


def _save_registry():
    """Save document registry to disk."""
    try:
        with open(REGISTRY_FILE, "w") as f:
            json.dump(document_registry, f, indent=2, default=str)
    except IOError as e:
        logger.error(f"Failed to save registry: {e}")


document_registry: dict[str, dict] = _load_registry()
logger.info(f"Loaded {len(document_registry)} documents from registry")


# ─── Request/Response Models ───
class ChatRequest(BaseModel):
    query: str
    filter_doc: Optional[str] = None


class ChatResponse(BaseModel):
    agent: str
    response: str
    sources: list
    steps: list
    routed_to: str


class DocumentResponse(BaseModel):
    id: str
    filename: str
    file_type: str
    upload_time: str
    chunk_count: int
    metadata: dict
    status: str


# ─── Helper Functions ───
def process_document(file_path: str, doc_id: str) -> dict:
    """Full RAG pipeline: Load → Chunk → Embed → Store."""
    doc = loader.load(file_path)

    chunks = chunker.chunk(
        text=doc["content"],
        metadata={
            "filename": doc["filename"],
            "file_type": doc["file_type"],
            "source": file_path,
        },
    )

    chunk_count = retriever.add_chunks(chunks, doc_id=doc_id)

    return {
        "id": doc_id,
        "filename": doc["filename"],
        "file_type": doc["file_type"],
        "upload_time": datetime.now().isoformat(),
        "chunk_count": chunk_count,
        "metadata": doc["metadata"],
        "status": "processed",
    }


# ─── Endpoints ───

@app.get("/")
async def root():
    """Health check."""
    return {
        "app": "FinScope AI",
        "version": "2.0.0",
        "status": "running",
        "documents_loaded": len(document_registry),
        "total_chunks": retriever.get_document_count(),
    }


@app.post("/api/upload", response_model=DocumentResponse)
async def upload_document(file: UploadFile = File(...)):
    """Upload a financial document. Processes through the RAG pipeline."""
    # Validate file type
    ext = Path(file.filename).suffix.lower()
    supported = {".pdf", ".csv", ".xlsx", ".xls", ".txt"}
    if ext not in supported:
        raise HTTPException(400, f"Unsupported file type: {ext}. Supported: {', '.join(supported)}")

    # Read and validate file size
    content = await file.read()
    size_mb = len(content) / (1024 * 1024)
    if size_mb > MAX_FILE_SIZE_MB:
        raise HTTPException(400, f"File too large ({size_mb:.1f}MB). Maximum: {MAX_FILE_SIZE_MB}MB")

    # Save file
    doc_id = str(uuid.uuid4())[:8]
    file_path = UPLOAD_DIR / f"{doc_id}_{file.filename}"
    with open(file_path, "wb") as f:
        f.write(content)

    try:
        doc_info = process_document(str(file_path), doc_id)
        document_registry[doc_id] = doc_info
        _save_registry()
        logger.info(f"Uploaded {file.filename} → {doc_info['chunk_count']} chunks")
        return DocumentResponse(**doc_info)
    except Exception as e:
        if file_path.exists():
            file_path.unlink()
        logger.error(f"Upload failed for {file.filename}: {e}")
        raise HTTPException(500, f"Processing failed: {str(e)}")


@app.post("/api/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """Send a query to the multi-agent system."""
    if not request.query.strip():
        raise HTTPException(400, "Query cannot be empty")

    if retriever.get_document_count() == 0:
        return ChatResponse(
            agent="Orchestrator",
            response="No documents have been uploaded yet. Please go to the Documents tab and upload some financial documents (invoices, bank statements, receipts), then come back and ask me questions.",
            sources=[],
            steps=["Checking document database...", "No documents found."],
            routed_to="NONE",
        )

    # Import here to avoid circular imports
    from agent.orchestrator import orchestrator
    result = orchestrator.run(request.query)
    return ChatResponse(**result)


@app.get("/api/documents")
async def list_documents():
    """List all processed documents."""
    return {
        "documents": list(document_registry.values()),
        "total": len(document_registry),
        "total_chunks": retriever.get_document_count(),
    }


@app.delete("/api/documents/{doc_id}")
async def delete_document(doc_id: str):
    """Remove a document and its chunks."""
    if doc_id not in document_registry:
        raise HTTPException(404, "Document not found")

    retriever.delete_document(doc_id)
    del document_registry[doc_id]
    _save_registry()
    logger.info(f"Deleted document {doc_id}")
    return {"status": "deleted", "doc_id": doc_id}


@app.get("/api/stats")
async def get_stats():
    """Get basic statistics."""
    return {
        "total_documents": len(document_registry),
        "total_chunks": retriever.get_document_count(),
    }


@app.get("/api/dashboard")
async def get_dashboard():
    """Get dynamic dashboard analytics from all uploaded documents."""
    return generate_dashboard_data(document_registry)


@app.post("/api/load-samples")
async def load_samples():
    """Load sample financial data for demo purposes."""
    loaded = []
    sample_files = list(SAMPLE_DATA_DIR.glob("*"))
    if not sample_files:
        raise HTTPException(404, "No sample data files found")

    for file_path in sample_files:
        if file_path.suffix.lower() in {".csv", ".pdf", ".xlsx", ".txt"}:
            # Skip if already loaded (check by filename)
            already_loaded = any(
                d["filename"] == file_path.name for d in document_registry.values()
            )
            if already_loaded:
                loaded.append(f"{file_path.name} (already loaded)")
                continue

            doc_id = str(uuid.uuid4())[:8]
            try:
                doc_info = process_document(str(file_path), doc_id)
                document_registry[doc_id] = doc_info
                loaded.append(doc_info["filename"])
                logger.info(f"Loaded sample: {file_path.name}")
            except Exception as e:
                logger.error(f"Failed to load sample {file_path.name}: {e}")

    _save_registry()

    return {
        "status": "loaded",
        "files": loaded,
        "total_documents": len(document_registry),
        "total_chunks": retriever.get_document_count(),
    }


@app.post("/api/reset")
async def reset_system():
    """Clear all documents and reset the vector database."""
    document_registry.clear()
    _save_registry()

    try:
        retriever.reset()
    except Exception:
        pass

    if UPLOAD_DIR.exists():
        shutil.rmtree(UPLOAD_DIR)
        UPLOAD_DIR.mkdir()

    logger.info("System reset complete")
    return {"status": "reset", "message": "All data cleared"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
