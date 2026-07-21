from typing import Literal

AgentType = Literal["portfolio", "client_research", "market_context"]


def classify_query(query: str) -> AgentType:
    lowered = query.lower()

    # Client research checked first — person names and suitability phrases
    # must win over generic terms like "risk" that also appear in portfolio context.
    client_keywords = [
        "client", "goal", "suitability", "retirement", "profile", "history",
        "risk tolerance", "investment objective", "time horizon",
        "alice", "bob", "sarah", "chen", "martinez", "johnson",
    ]
    portfolio_keywords = [
        "portfolio", "allocation", "exposure", "holdings", "rebalance",
        "asset mix", "weight",
    ]
    market_keywords = [
        "market", "fund", "factsheet", "aum", "interest rate", "sector",
        "equity", "bond", "highlight", "outlook", "q1", "q2", "q3", "q4",
        "2025", "2026", "performance", "return",
    ]

    if any(keyword in lowered for keyword in client_keywords):
        return "client_research"
    if any(keyword in lowered for keyword in portfolio_keywords):
        return "portfolio"
    if any(keyword in lowered for keyword in market_keywords):
        return "market_context"
    return "portfolio"
