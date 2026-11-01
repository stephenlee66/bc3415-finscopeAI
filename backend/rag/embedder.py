"""
Embedder — Generates vector embeddings using sentence-transformers.
Uses all-MiniLM-L6-v2 (free, runs locally, 384-dimensional vectors).
"""
from typing import Optional
from config import EMBEDDING_MODEL


class Embedder:
    """Generates embeddings using sentence-transformers (runs locally, FREE)."""

    def __init__(self, model_name: str = EMBEDDING_MODEL):
        self.model_name = model_name
        self._model = None

    @property
    def model(self):
        """Lazy-load the model on first use."""
        if self._model is None:
            from sentence_transformers import SentenceTransformer
            print(f"Loading embedding model: {self.model_name}...")
            self._model = SentenceTransformer(self.model_name)
            print(f"Embedding model loaded. Dimension: {self._model.get_sentence_embedding_dimension()}")
        return self._model

    def embed_text(self, text: str) -> list[float]:
        """Embed a single text string."""
        embedding = self.model.encode(text, normalize_embeddings=True)
        return embedding.tolist()

    def embed_batch(self, texts: list[str], batch_size: int = 32) -> list[list[float]]:
        """Embed a batch of text strings."""
        embeddings = self.model.encode(
            texts,
            batch_size=batch_size,
            normalize_embeddings=True,
            show_progress_bar=len(texts) > 10,
        )
        return embeddings.tolist()

    def get_dimension(self) -> int:
        """Return the embedding dimension."""
        return self.model.get_sentence_embedding_dimension()


# Singleton instance
embedder = Embedder()
