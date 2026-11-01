"""
Agent Orchestrator — Routes user queries to the appropriate specialist agent.
Uses weighted keyword routing with priority rules. No LLM call needed.
"""
import logging
from agent.agents import extractor_agent, auditor_agent, reporter_agent

logger = logging.getLogger(__name__)

# Keywords with weights — higher weight = stronger signal
AUDIT_KEYWORDS = {
    # Strong signals (weight 3)
    "duplicate": 3, "anomal": 3, "fraud": 3, "suspicious": 3, "audit": 3,
    # Medium signals (weight 2)
    "flag": 2, "error": 2, "wrong": 2, "mismatch": 2, "inconsisten": 2,
    "overcharg": 2, "double": 2, "irregular": 2, "discrepanc": 2,
    # Weak signals (weight 1)
    "missing": 1, "issue": 1, "unusual": 1, "check": 1, "verify": 1,
    "legitimate": 1, "valid": 1,
}

EXTRACT_KEYWORDS = {
    # Strong signals (weight 3)
    "how much": 3, "what amount": 3, "total for": 3, "exactly": 3,
    # Medium signals (weight 2)
    "amount": 2, "vendor": 2, "invoice number": 2, "line item": 2,
    "charge": 2, "cost of": 2, "paid": 2, "price": 2, "fee": 2,
    "receipt": 2, "spent": 2, "owe": 2, "balance": 2,
    # Weak signals (weight 1)
    "how about": 1, "what about": 1, "detail": 1, "specific": 1,
    "what did": 1, "who charged": 1, "list": 1, "show": 1, "get": 1,
    "find": 1, "pull": 1, "extract": 1,
}

REPORT_KEYWORDS = {
    # Strong signals (weight 3)
    "summary": 3, "summarize": 3, "summarise": 3, "report": 3,
    "overview": 3, "executive": 3,
    # Medium signals (weight 2)
    "trend": 2, "compar": 2, "analyz": 2, "analyse": 2,
    "top expense": 2, "recommend": 2, "insight": 2, "breakdown": 2,
    "categoriz": 2, "categoris": 2,
    # Weak signals (weight 1)
    "forecast": 1, "month": 1, "quarter": 1, "annual": 1,
    "budget": 1, "pattern": 1, "highlight": 1, "observation": 1,
}

# Priority patterns — these override keyword scoring
# If query starts with or contains these patterns, force route
EXTRACT_PRIORITY = [
    "how much", "what is the total", "what did", "who charged",
    "show me the", "what amount", "how many",
]

AUDIT_PRIORITY = [
    "find duplicate", "check for duplicate", "any duplicate",
    "audit", "are there any issues", "flag",
]


class Orchestrator:
    """Routes queries to the appropriate specialist agent using weighted keyword matching."""

    def __init__(self):
        self.agents = {
            "EXTRACT": extractor_agent,
            "AUDIT": auditor_agent,
            "REPORT": reporter_agent,
        }

    def route(self, query: str) -> str:
        """Classify query intent using weighted keyword matching with priority overrides."""
        q = query.lower().strip()

        # Priority overrides — check first
        for pattern in AUDIT_PRIORITY:
            if pattern in q:
                logger.info(f"Routing query to AUDIT (priority match: '{pattern}')")
                return "AUDIT"

        for pattern in EXTRACT_PRIORITY:
            if q.startswith(pattern) or pattern in q:
                logger.info(f"Routing query to EXTRACT (priority match: '{pattern}')")
                return "EXTRACT"

        # Weighted keyword scoring
        audit_score = sum(w for kw, w in AUDIT_KEYWORDS.items() if kw in q)
        extract_score = sum(w for kw, w in EXTRACT_KEYWORDS.items() if kw in q)
        report_score = sum(w for kw, w in REPORT_KEYWORDS.items() if kw in q)

        scores = {"AUDIT": audit_score, "EXTRACT": extract_score, "REPORT": report_score}
        best = max(scores, key=scores.get)

        # Default to REPORT if no keywords matched
        if scores[best] == 0:
            best = "REPORT"

        logger.info(f"Routing query to {best} (scores: {scores})")
        return best

    def run(self, query: str) -> dict:
        """Route query to appropriate agent and return the result."""
        category = self.route(query)
        agent = self.agents[category]

        try:
            result = agent.run(query)
            result["routed_to"] = category
            return result
        except Exception as e:
            error_msg = str(e)
            if "rate limit" in error_msg.lower() or "429" in error_msg or "quota" in error_msg.lower():
                friendly = "I'm temporarily rate-limited by the AI provider. Please wait 15-20 seconds and try again."
            elif "api key" in error_msg.lower() or "401" in error_msg or "403" in error_msg:
                friendly = "There's an issue with the API key configuration. Please check that GEMINI_API_KEY is set correctly."
            else:
                friendly = f"I encountered an issue processing your request. Please try again in a moment. (Error: {error_msg[:150]})"

            return {
                "agent": "Orchestrator",
                "response": friendly,
                "sources": [],
                "steps": ["Routing query...", f"Error in {category} agent"],
                "routed_to": category,
            }


# Singleton
orchestrator = Orchestrator()
