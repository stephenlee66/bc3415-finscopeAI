"""
Text Chunker — Splits document text into overlapping chunks for embedding.
Uses recursive character splitting with configurable chunk size and overlap.
"""
from typing import Optional
from config import CHUNK_SIZE, CHUNK_OVERLAP


class TextChunker:
    """Splits text into overlapping chunks optimized for embedding and retrieval."""

    def __init__(self, chunk_size: int = CHUNK_SIZE, overlap: int = CHUNK_OVERLAP):
        self.chunk_size = chunk_size
        self.overlap = overlap
        # Split on these separators in priority order
        self.separators = ["\n\n", "\n", ". ", ", ", " "]

    def chunk(self, text: str, metadata: Optional[dict] = None) -> list[dict]:
        """
        Split text into overlapping chunks.

        Returns list of:
            {
                "text": str,
                "chunk_index": int,
                "metadata": dict
            }
        """
        if not text.strip():
            return []

        chunks = self._recursive_split(text)
        base_metadata = metadata or {}

        result = []
        for i, chunk_text in enumerate(chunks):
            result.append({
                "text": chunk_text.strip(),
                "chunk_index": i,
                "metadata": {
                    **base_metadata,
                    "chunk_index": i,
                    "total_chunks": len(chunks),
                    "char_count": len(chunk_text),
                },
            })

        return result

    def _recursive_split(self, text: str) -> list[str]:
        """Recursively split text using separators in priority order."""
        if len(text) <= self.chunk_size:
            return [text] if text.strip() else []

        # Try each separator
        for sep in self.separators:
            if sep in text:
                splits = text.split(sep)
                chunks = []
                current = ""

                for split in splits:
                    candidate = current + sep + split if current else split

                    if len(candidate) <= self.chunk_size:
                        current = candidate
                    else:
                        if current:
                            chunks.append(current)
                        # If single split is too large, recurse on it
                        if len(split) > self.chunk_size:
                            chunks.extend(self._recursive_split(split))
                            current = ""
                        else:
                            current = split

                if current:
                    chunks.append(current)

                # Add overlap between chunks
                if self.overlap > 0:
                    chunks = self._add_overlap(chunks)

                return [c for c in chunks if c.strip()]

        # Fallback: hard split by character count
        chunks = []
        for i in range(0, len(text), self.chunk_size - self.overlap):
            chunk = text[i : i + self.chunk_size]
            if chunk.strip():
                chunks.append(chunk)
        return chunks

    def _add_overlap(self, chunks: list[str]) -> list[str]:
        """Add overlap between consecutive chunks."""
        if len(chunks) <= 1:
            return chunks

        overlapped = [chunks[0]]
        for i in range(1, len(chunks)):
            prev = chunks[i - 1]
            overlap_text = prev[-self.overlap :] if len(prev) > self.overlap else prev
            overlapped.append(overlap_text + " " + chunks[i])

        return overlapped


# Singleton instance
chunker = TextChunker()
