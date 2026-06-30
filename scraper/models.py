import os
from datetime import datetime, timezone
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()

# Fuerza Google DNS para resolver el SRV de MongoDB Atlas
# (igual que hicimos en Node.js con dns.setServers)
try:
    import dns.resolver
    _resolver = dns.resolver.Resolver(configure=False)
    _resolver.nameservers = ["8.8.8.8", "8.8.4.4"]
    dns.resolver.default_resolver = _resolver
except Exception:
    pass

_client = MongoClient(os.environ["MONGODB_URI"])
_db = _client.get_default_database()
_rankings = _db["skill_rankings"]


def save_ranking(especialidad: str, data: dict) -> None:
    """Guarda el ranking de skills indexado por especialidad."""
    key = especialidad.lower()
    _rankings.update_one(
        {"especialidad": key},
        {
            "$set": {
                "especialidad": key,
                "skills": data["skills"],
                "total_jobs": data["total_jobs"],
                "query": data["query"],
                "updatedAt": datetime.now(timezone.utc),
            }
        },
        upsert=True,
    )


def get_ranking(especialidad: str, limit: int = 5) -> dict | None:
    doc = _rankings.find_one({"especialidad": especialidad.lower()}, {"_id": 0})
    if not doc:
        return None
    return {
        "especialidad": doc["especialidad"],
        "skills": doc["skills"][:limit],
        "total_jobs": doc.get("total_jobs", 0),
        "updatedAt": doc.get("updatedAt", "").isoformat() if doc.get("updatedAt") else None,
    }


def list_especialidades() -> list[str]:
    return [d["especialidad"] for d in _rankings.find({}, {"especialidad": 1, "_id": 0})]
