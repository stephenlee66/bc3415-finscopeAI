"""
Retriever — Stores and retrieves document chunks using ChromaDB vector database.
"""
import chromadb
from chromadb.config import Settings
from typing import Optional
from config import CHROMA_DIR, COLLECTION_NAME, TOP_K_RESULTS
from rag.embedder import embedder


class Retriever:
    """ChromaDB-backed vector store for document retrieval."""

    def __init__(self):
        self._client = None
        self._collection = None

    @property
    def client(self):
        if self._client is None:
            self._client = chromadb.PersistentClient(
                path=str(CHROMA_DIR),
                settings=Settings(anonymized_telemetry=False),
            )
        return self._client

    @property
    def collection(self):
        if self._collection is None:
            self._collection = self.client.get_or_create_collection(
                name=COLLECTION_NAME,
                metadata={"hnsw:space": "cosine"},
            )
        return self._collection

    def add_chunks(self, chunks: list[dict], doc_id: str) -> int:
        """
        Add document chunks to the vector store.

        Args:
            chunks: List of {"text": str, "chunk_index": int, "metadata": dict}
            doc_id: Unique document identifier

        Returns:
            Number of chunks added
        """
        if not chunks:
            return 0

        texts = [c["text"] for c in chunks]
        embeddings = embedder.embed_batch(texts)

        ids = [f"{doc_id}_chunk_{c['chunk_index']}" for c in chunks]
        metadatas = []
        for c in chunks:
            meta = {k: str(v) for k, v in c["metadata"].items()}
            meta["doc_id"] = doc_id
            metadatas.append(meta)

        self.collection.add(
            ids=ids,
            embeddings=embeddings,
            documents=texts,
            metadatas=metadatas,
        )

        return len(chunks)

    def search(self, query: str, top_k: int = TOP_K_RESULTS, filter_doc: Optional[str] = None) -> list[dict]:
        """
        Search for relevant chunks given a query.

        Returns list of:
            {
                "text": str,
                "score": float (cosine similarity),
                "metadata": dict
            }
        """
        query_embedding = embedder.embed_text(query)

        where_filter = None
        if filter_doc:
            where_filter = {"doc_id": filter_doc}

        results = self.collection.query(
            query_embeddings=[query_embedding],
            n_results=top_k,
            where=where_filter,
            include=["documents", "metadatas", "distances"],
        )

        output = []
        if results and results["documents"]:
            for i in range(len(results["documents"][0])):
                output.append({
                    "text": results["documents"][0][i],
                    "score": 1 - results["distances"][0][i],  # Convert distance to similarity
                    "metadata": results["metadatas"][0][i] if results["metadatas"] else {},
                })

        return output

    def get_all_documents(self) -> list[str]:
        """Get all unique document IDs in the collection."""
        try:
            all_meta = self.collection.get(include=["metadatas"])
            doc_ids = set()
            if all_meta and all_meta["metadatas"]:
                for meta in all_meta["metadatas"]:
                    if "doc_id" in meta:
                        doc_ids.add(meta["doc_id"])
            return list(doc_ids)
        except Exception:
            return []

    def get_document_count(self) -> int:
        """Get total number of chunks in the collection."""
        return self.collection.count()

    def delete_document(self, doc_id: str):
        """Remove all chunks for a specific document."""
        try:
            all_data = self.collection.get(
                where={"doc_id": doc_id},
                include=["metadatas"],
            )
            if all_data and all_data["ids"]:
                self.collection.delete(ids=all_data["ids"])
        except Exception as e:
            print(f"Error deleting document {doc_id}: {e}")

    def reset(self):
        """Clear the entire collection."""
        self.client.delete_collection(COLLECTION_NAME)
        self._collection = None


# Singleton instance
retriever = Retriever()
