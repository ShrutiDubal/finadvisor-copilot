from pathlib import Path
from typing import Dict, List

KNOWLEDGE_BASE_PATH = (
    Path(__file__).resolve().parents[2] / "data" / "knowledge_base"
)

STOP_WORDS = {
    "a", "an", "the", "is", "are", "was", "were", "be", "been", "being",
    "have", "has", "had", "do", "does", "did", "will", "would", "could",
    "should", "may", "might", "can", "to", "of", "in", "for", "on", "with",
    "at", "by", "from", "me", "show", "what", "how", "tell", "about", "give",
    "its", "it", "this", "that", "these", "those", "and", "or", "but", "so",
    "i", "my", "their", "your", "his", "her", "our", "its", "please", "s",
}


class RagService:
    def __init__(self) -> None:
        self.chunks: List[Dict[str, str]] = []

    def initialize(self) -> None:
        self.chunks = self._load_documents()

    # Known people in the knowledge base (first + last, lowercase)
    _KNOWN_PEOPLE = [
        {"tokens": {"alice", "chen"}, "key": "alice chen"},
        {"tokens": {"bob", "martinez"}, "key": "bob martinez"},
        {"tokens": {"sarah", "johnson"}, "key": "sarah johnson"},
    ]

    def _named_people_in_query(self, query_lower: str) -> set[str]:
        """Return the set of person keys explicitly mentioned in the query."""
        # strip punctuation so "bob martinez's" → "bob martinez"
        cleaned = query_lower.replace("'s", "").replace("'", "").replace(",", "")
        words = set(cleaned.split())
        mentioned = set()
        for person in self._KNOWN_PEOPLE:
            if person["tokens"].issubset(words):
                mentioned.add(person["key"])
        return mentioned

    def retrieve(self, query: str, top_k: int = 3) -> List[Dict[str, str | float]]:
        if top_k <= 0:
            return []
        if not self.chunks:
            self.chunks = self._load_documents()

        query_lower = query.lower().replace("'", "")
        query_words = {
            w for w in query_lower.split()
            if w not in STOP_WORDS and len(w) > 1
        }

        mentioned_people = self._named_people_in_query(query_lower)

        scored: List[tuple[float, Dict[str, str]]] = []
        for doc in self.chunks:
            searchable = (doc["source"].replace("_", " ").replace(".txt", "") +
                          " " + doc["content"]).lower()
            hits = sum(1 for w in query_words if w in searchable)
            partial = sum(0.3 for w in query_words if len(w) > 4 and w in searchable)
            score = hits + partial

            if mentioned_people:
                # Big boost if this doc is about a person explicitly named in the query
                doc_people = {
                    p["key"] for p in self._KNOWN_PEOPLE
                    if p["tokens"].issubset(set(searchable.split()))
                }
                if doc_people & mentioned_people:
                    score += 10  # strongly prefer docs about the named person
                elif doc_people - mentioned_people:
                    score -= 5   # penalise docs about other people

            if score > 0:
                scored.append((score, doc))

        scored.sort(key=lambda x: x[0], reverse=True)

        # Only keep docs that score at least 50% of the best match
        if scored:
            best = scored[0][0]
            scored = [(s, d) for s, d in scored if s >= best * 0.5]

        top = scored[:top_k]

        return [
            {
                "source": doc["source"],
                "content": doc["content"],
                "score": round(score, 3),
            }
            for score, doc in top
        ]

    def _load_documents(self) -> List[Dict[str, str]]:
        docs: List[Dict[str, str]] = []
        for path in sorted(KNOWLEDGE_BASE_PATH.glob("*.txt")):
            content = path.read_text(encoding="utf-8").strip()
            if not content:
                continue
            docs.append({"source": path.name, "content": content})
        return docs


rag_service = RagService()
