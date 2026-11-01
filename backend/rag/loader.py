"""
Document Loader — Extracts text from PDFs, CSVs, and XLSX files.
Supports: .pdf, .csv, .xlsx, .txt
"""
import os
from pathlib import Path
from typing import Optional
import pandas as pd

# PDF extraction
try:
    import pdfplumber
    HAS_PDFPLUMBER = True
except ImportError:
    HAS_PDFPLUMBER = False

try:
    from PyPDF2 import PdfReader
    HAS_PYPDF2 = True
except ImportError:
    HAS_PYPDF2 = False


class DocumentLoader:
    """Loads and extracts text content from financial documents."""

    SUPPORTED_EXTENSIONS = {".pdf", ".csv", ".xlsx", ".xls", ".txt"}

    def load(self, file_path: str) -> dict:
        """
        Load a document and extract its text content.

        Returns:
            {
                "filename": str,
                "file_type": str,
                "content": str,
                "metadata": dict (extracted financial info)
            }
        """
        path = Path(file_path)
        ext = path.suffix.lower()

        if ext not in self.SUPPORTED_EXTENSIONS:
            raise ValueError(f"Unsupported file type: {ext}. Supported: {self.SUPPORTED_EXTENSIONS}")

        if ext == ".pdf":
            content, metadata = self._load_pdf(path)
        elif ext == ".csv":
            content, metadata = self._load_csv(path)
        elif ext in (".xlsx", ".xls"):
            content, metadata = self._load_excel(path)
        elif ext == ".txt":
            content, metadata = self._load_text(path)
        else:
            raise ValueError(f"Unhandled extension: {ext}")

        return {
            "filename": path.name,
            "file_type": ext.lstrip("."),
            "content": content,
            "metadata": {
                "source": str(path),
                "file_size": os.path.getsize(path),
                **metadata,
            },
        }

    def _load_pdf(self, path: Path) -> tuple[str, dict]:
        """Extract text from PDF using pdfplumber (preferred) or PyPDF2 (fallback)."""
        text = ""
        metadata = {"page_count": 0}

        if HAS_PDFPLUMBER:
            with pdfplumber.open(path) as pdf:
                metadata["page_count"] = len(pdf.pages)
                for page in pdf.pages:
                    page_text = page.extract_text()
                    if page_text:
                        text += page_text + "\n\n"

                    # Also try to extract tables
                    tables = page.extract_tables()
                    for table in tables:
                        for row in table:
                            cleaned = [str(cell) if cell else "" for cell in row]
                            text += " | ".join(cleaned) + "\n"
                        text += "\n"

        elif HAS_PYPDF2:
            reader = PdfReader(str(path))
            metadata["page_count"] = len(reader.pages)
            for page in reader.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n\n"
        else:
            raise ImportError("No PDF library available. Install pdfplumber or PyPDF2.")

        return text.strip(), metadata

    def _load_csv(self, path: Path) -> tuple[str, dict]:
        """Load CSV and convert to structured text."""
        df = pd.read_csv(path)
        metadata = {
            "row_count": len(df),
            "columns": list(df.columns),
        }

        # Convert to readable text format
        lines = []
        lines.append(f"CSV Document: {path.name}")
        lines.append(f"Columns: {', '.join(df.columns)}")
        lines.append(f"Total rows: {len(df)}")
        lines.append("")

        # Add summary statistics for numeric columns
        numeric_cols = df.select_dtypes(include=["number"]).columns
        if len(numeric_cols) > 0:
            lines.append("Numeric Summary:")
            for col in numeric_cols:
                lines.append(f"  {col}: min={df[col].min()}, max={df[col].max()}, "
                           f"mean={df[col].mean():.2f}, total={df[col].sum():.2f}")
            lines.append("")

        # Add all rows as text
        lines.append("Data:")
        for idx, row in df.iterrows():
            row_parts = [f"{col}: {val}" for col, val in row.items()]
            lines.append(f"  Row {idx + 1}: {' | '.join(row_parts)}")

        return "\n".join(lines), metadata

    def _load_excel(self, path: Path) -> tuple[str, dict]:
        """Load Excel file and convert to structured text."""
        df = pd.read_excel(path)
        metadata = {
            "row_count": len(df),
            "columns": list(df.columns),
        }

        lines = []
        lines.append(f"Excel Document: {path.name}")
        lines.append(f"Columns: {', '.join(str(c) for c in df.columns)}")
        lines.append(f"Total rows: {len(df)}")
        lines.append("")

        for idx, row in df.iterrows():
            row_parts = [f"{col}: {val}" for col, val in row.items()]
            lines.append(f"  Row {idx + 1}: {' | '.join(row_parts)}")

        return "\n".join(lines), metadata

    def _load_text(self, path: Path) -> tuple[str, dict]:
        """Load plain text file."""
        content = path.read_text(encoding="utf-8")
        metadata = {"char_count": len(content)}
        return content, metadata


# Singleton instance
loader = DocumentLoader()
