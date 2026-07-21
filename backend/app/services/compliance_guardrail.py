from typing import Dict, List

BLOCKED_PATTERNS = [
    "you should buy",
    "i recommend purchasing",
    "sell your",
    "guaranteed return",
    "will definitely",
    "sure to profit",
]

SAFE_FALLBACK_MESSAGE = (
    "I can't provide a direct recommendation on this — it falls outside compliance guidelines. "
    "The retrieved source documents are shown below for reference."
)


def detect_guardrail_hit(text: str) -> bool:
    lowered = text.lower()
    return any(pattern in lowered for pattern in BLOCKED_PATTERNS)


def build_safe_fallback(retrieved_docs: List[Dict[str, str | float]]) -> str:
    return SAFE_FALLBACK_MESSAGE
