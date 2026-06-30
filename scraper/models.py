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
_profiles = _db["profiles"]  # lo escribe el bot Node (mongoose), aquí solo se lee


def metricas() -> dict:
    """Agrega métricas de uso del bot desde la colección de perfiles."""
    total = _profiles.count_documents({})
    completos = _profiles.count_documents({"onboardingCompleto": True})

    # Distribución y puntos promedio por especialidad
    dist = list(_profiles.aggregate([
        {"$match": {"especialidad": {"$nin": [None, ""]}}},
        {"$group": {
            "_id": "$especialidad",
            "usuarios": {"$sum": 1},
            "puntos_prom": {"$avg": "$puntos"},
        }},
        {"$sort": {"usuarios": -1}},
    ]))

    # Score promedio por especialidad (último score de cada usuario)
    scores = list(_profiles.aggregate([
        {"$match": {"cvScores.0": {"$exists": True}}},
        {"$project": {
            "especialidad": 1,
            "ultimo": {"$arrayElemAt": ["$cvScores.score", -1]},
        }},
        {"$group": {"_id": "$especialidad", "score_prom": {"$avg": "$ultimo"}}},
    ]))
    score_map = {s["_id"]: round(s.get("score_prom") or 0) for s in scores}

    # Totales globales
    glob = list(_profiles.aggregate([
        {"$group": {
            "_id": None,
            "puntos_totales": {"$sum": "$puntos"},
            "racha_maxima": {"$max": "$racha"},
        }},
    ]))
    g = glob[0] if glob else {}

    return {
        "usuarios": total,
        "onboarding_completos": completos,
        "puntos_totales": g.get("puntos_totales", 0) or 0,
        "racha_maxima": g.get("racha_maxima", 0) or 0,
        "especialidades": [
            {
                "especialidad": d["_id"],
                "usuarios": d["usuarios"],
                "puntos_prom": round(d.get("puntos_prom") or 0),
                "score_prom": score_map.get(d["_id"], 0),
            }
            for d in dist
        ],
    }


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
