"""
LLM Service — Wraps Gemini API calls with retry logic, rate limit handling,
and graceful error recovery.
"""
import time
import logging
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate
from config import GEMINI_API_KEY, GEMINI_MODEL, MAX_RETRIES, RETRY_DELAY_BASE

logger = logging.getLogger(__name__)


class LLMService:
    """Manages Gemini LLM calls with automatic retry on rate limits."""

    def __init__(self):
        self._llm_cache = {}

    def get_llm(self, temperature: float = 0.2) -> ChatGoogleGenerativeAI:
        """Get or create a cached LLM instance for a given temperature."""
        key = f"t_{temperature}"
        if key not in self._llm_cache:
            self._llm_cache[key] = ChatGoogleGenerativeAI(
                model=GEMINI_MODEL,
                google_api_key=GEMINI_API_KEY,
                temperature=temperature,
                max_retries=0,  # We handle retries ourselves
            )
        return self._llm_cache[key]

    def invoke(self, system_prompt: str, query: str, temperature: float = 0.2) -> str:
        """
        Call the LLM with automatic retry on rate limits.

        Args:
            system_prompt: System message for the LLM
            query: User query
            temperature: LLM temperature (0.0 = deterministic, 1.0 = creative)

        Returns:
            LLM response text

        Raises:
            Exception if all retries exhausted
        """
        llm = self.get_llm(temperature)
        prompt = ChatPromptTemplate.from_messages([
            ("system", system_prompt),
            ("human", "{query}"),
        ])
        chain = prompt | llm

        last_error = None
        for attempt in range(1, MAX_RETRIES + 1):
            try:
                result = chain.invoke({"query": query})

                # Handle different response formats from Gemini models
                content = result.content

                # Some models return a list of content blocks instead of a string
                if isinstance(content, list):
                    text_parts = []
                    for block in content:
                        if isinstance(block, str):
                            text_parts.append(block)
                        elif isinstance(block, dict) and block.get("type") == "text":
                            text_parts.append(block.get("text", ""))
                        elif hasattr(block, "text"):
                            text_parts.append(block.text)
                    content = "\n".join(text_parts)

                if not isinstance(content, str):
                    content = str(content)

                return content

            except Exception as e:
                last_error = e
                error_str = str(e).lower()

                # Rate limit — wait and retry
                if "429" in str(e) or "resource_exhausted" in error_str or "quota" in error_str:
                    wait_time = RETRY_DELAY_BASE * (2 ** (attempt - 1))  # Exponential backoff
                    logger.warning(f"Rate limited (attempt {attempt}/{MAX_RETRIES}). Waiting {wait_time}s...")
                    time.sleep(wait_time)
                    continue

                # Model not found — immediate fail, don't retry
                if "404" in str(e) or "not_found" in error_str:
                    logger.error(f"Model not found: {GEMINI_MODEL}. Check config.py.")
                    raise

                # Auth error — immediate fail
                if "401" in str(e) or "403" in str(e) or "permission" in error_str:
                    logger.error("Authentication failed. Check GEMINI_API_KEY.")
                    raise

                # Unknown error — retry with backoff
                wait_time = RETRY_DELAY_BASE * attempt
                logger.warning(f"LLM error (attempt {attempt}/{MAX_RETRIES}): {e}. Retrying in {wait_time}s...")
                time.sleep(wait_time)

        # All retries exhausted
        raise Exception(
            f"LLM call failed after {MAX_RETRIES} attempts. Last error: {last_error}. "
            f"This is likely due to Gemini rate limits. Please wait 30 seconds and try again."
        )


# Singleton
llm_service = LLMService()
