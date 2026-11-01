"""
Specialist Agents — Extractor, Auditor, Reporter
Short, focused prompts that the model will reliably follow.
"""
from llm_service import llm_service
from rag.retriever import retriever


# ═══════════════════════════════════════════════════════════════
# EXTRACTOR AGENT
# ═══════════════════════════════════════════════════════════════

EXTRACTOR_PROMPT = """You are the Extractor Agent. Pull exact financial values from the documents below.

Rules:
1. Use only values explicitly written in the context. Never estimate.
2. Format currency as $X,XXX.XX.
3. Cite as (Source: [filename], [invoice/receipt ID or vendor name]). Never cite row numbers.
4. When listing items with a total, add them up yourself and verify the sum is correct before writing it. If it does not add up, fix it.
5. Perform all arithmetic using the exact values from the documents. Do not round intermediate steps. Only round the final displayed result to 2 decimal places.
5. If a value appears differently across files (e.g., $4,250 vs $4,632.50), explain whether the difference is due to tax, partial payment, or other reasons visible in the documents.
6. If data is not found, say so. Do not guess.
7. No emojis. No padding. Direct answers first, tables for comparisons.

{context}"""


class ExtractorAgent:
    """Extracts structured financial data from documents."""

    def run(self, query: str, top_k: int = 8) -> dict:
        steps = [
            "Searching document database...",
            "Extracting financial data points...",
            "Cross-referencing across documents...",
            "Validating extracted values...",
        ]

        results = retriever.search(query, top_k=top_k)
        context = _format_context(results)
        prompt = EXTRACTOR_PROMPT.replace("{context}", context)

        response = llm_service.invoke(prompt, query, temperature=0.05)

        return {
            "agent": "Extractor",
            "response": response,
            "sources": _format_sources(results),
            "steps": steps,
        }


# ═══════════════════════════════════════════════════════════════
# AUDITOR AGENT
# ═══════════════════════════════════════════════════════════════

AUDITOR_PROMPT = """You are the Auditor Agent. Find genuine financial issues in the documents below. If there are no real issues, say so — that is a valid outcome.

Rules:
1. A potential duplicate requires at least: same vendor AND same amount AND similar description. Two of three is not enough.
2. An invoice amount matching a bank debit is expected (that is a payment), not a duplicate.
3. Compare like with like: if one amount is pre-tax and another includes GST, they are the same transaction — not a discrepancy.
4. Cite as (Source: [filename], [invoice/receipt ID or vendor name]). Never cite row numbers.
5. Do not flag recurring payments (rent, payroll, insurance) as anomalies.
6. Use careful language: "potential issue requiring verification" not "confirmed duplicate."
7. Perform all arithmetic using exact values from the documents. Only round the final result to 2 decimal places.

For each finding use this table:

### Finding: [Title]

| Field | Detail |
| --- | --- |
| Classification | Potential issue requiring verification / Likely issue based on strong evidence |
| Evidence | Exact values with (Source: filename, identifier) |
| Business impact | What this could cost |
| Recommended action | What to do next |
| Confidence | High/Medium/Low — state which attributes matched |

If no issues found, state that clearly and note what looks healthy.
No emojis. No forced findings.

{context}"""


class AuditorAgent:
    """Detects anomalies, duplicates, and errors in financial documents."""

    def run(self, query: str, top_k: int = 15) -> dict:
        steps = [
            "Scanning all financial records...",
            "Cross-referencing vendor + amount + date combinations...",
            "Analyzing spending patterns for outliers...",
            "Checking data completeness and consistency...",
            "Assessing severity and confidence levels...",
        ]

        results = retriever.search(query, top_k=top_k)
        context = _format_context(results)
        prompt = AUDITOR_PROMPT.replace("{context}", context)

        response = llm_service.invoke(prompt, query, temperature=0.1)

        return {
            "agent": "Auditor",
            "response": response,
            "sources": _format_sources(results),
            "steps": steps,
        }


# ═══════════════════════════════════════════════════════════════
# REPORTER AGENT
# ═══════════════════════════════════════════════════════════════

REPORTER_PROMPT = """You are the Reporter Agent. Turn financial data into clear, decision-ready insight.

Rules:
1. Every number must come from the documents. Verify totals add up before writing them.
2. Perform all arithmetic using exact values. Do not round intermediate steps. Only round final displayed totals to 2 decimal places and percentages to 1 decimal place.
3. Calculate percentages from your actual total. Check they sum to roughly 100%%. If not, recompute.
3. Cite as (Source: [filename], [invoice/receipt ID or vendor name]). Never cite row numbers.
4. Separate facts from observations. Use "this suggests..." or "management may wish to review..." for interpretation.
5. Do not claim trends with only one month of data — say "single period, trend analysis requires more data."
6. Do not make strategy recommendations unless the data directly supports them with specific numbers.
7. Only include categories or rows that have actual data. Do not show $0 categories.
8. No emojis.

For broad questions use this structure (skip sections if data is insufficient):

### Executive Summary
2-3 sentences with the key finding.

### Spending Breakdown
| Category | Amount | %% of Total | Observation |
| --- | --- | --- | --- |
(Only categories with data. Percentages must sum to ~100%%.)

### What Stands Out
Facts first, then observations labelled as interpretation.

### Recommendations
1-3 evidence-bound actions. Cautious phrasing.

For focused questions, answer directly without the full structure.

{context}"""


class ReporterAgent:
    """Generates financial summaries, reports, and trend analysis."""

    def run(self, query: str, top_k: int = 10) -> dict:
        steps = [
            "Compiling data from all documents...",
            "Calculating totals and category breakdowns...",
            "Analyzing trends and patterns...",
            "Generating actionable recommendations...",
            "Formatting executive report...",
        ]

        results = retriever.search(query, top_k=top_k)
        context = _format_context(results)
        prompt = REPORTER_PROMPT.replace("{context}", context)

        response = llm_service.invoke(prompt, query, temperature=0.2)

        return {
            "agent": "Reporter",
            "response": response,
            "sources": _format_sources(results),
            "steps": steps,
        }


# ═══════════════════════════════════════════════════════════════
# SHARED UTILITIES
# ═══════════════════════════════════════════════════════════════

def _format_context(results: list[dict]) -> str:
    """Format retrieved chunks into context string with metadata."""
    if not results:
        return "No relevant documents found in the database."

    parts = []
    for i, r in enumerate(results):
        filename = r["metadata"].get("filename", "Unknown")
        file_type = r["metadata"].get("file_type", "")
        score = r["score"]

        header = f"[Source: {filename}]"
        if file_type:
            header += f" ({file_type})"
        header += f" — Relevance: {score:.0%}"

        parts.append(f"{header}\n{r['text']}")

    return ("\n\n" + "-" * 40 + "\n\n").join(parts)


def _format_sources(results: list[dict]) -> list[dict]:
    """Format source references for the frontend."""
    return [
        {
            "text": r["text"][:200],
            "score": round(r["score"], 3),
            "metadata": r["metadata"],
        }
        for r in results
    ]


# Singletons
extractor_agent = ExtractorAgent()
auditor_agent = AuditorAgent()
reporter_agent = ReporterAgent()
