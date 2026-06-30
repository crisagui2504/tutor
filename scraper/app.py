import atexit
import os
from datetime import datetime, timezone, timedelta
from flask import Flask, jsonify, request
from apscheduler.schedulers.background import BackgroundScheduler
from dotenv import load_dotenv

from scraper import scrape_occ, SEED_DATA, DEFAULT_SEED
from models import save_ranking, get_ranking, list_especialidades
from becas import filtrar_becas

load_dotenv()

app = Flask(__name__)

# Secreto compartido con el bot Node. Si está vacío, la auth queda desactivada
# (cómodo en local); en producción ponlo en ambos .env.
API_SECRET_KEY = os.getenv("API_SECRET_KEY", "").strip()


@app.before_request
def _check_api_key():
    """Valida el header X-API-Key en todos los endpoints menos /health.

    Solo se exige si API_SECRET_KEY está configurada; así local sigue simple.
    """
    if not API_SECRET_KEY or request.path == "/health":
        return None
    if request.headers.get("X-API-Key", "") != API_SECRET_KEY:
        return jsonify({"error": "No autorizado"}), 401
    return None


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@app.get("/health")
def health():
    return jsonify({"status": "ok"})


@app.get("/skills")
def skills():
    """GET /skills?especialidad=datos-ia&limit=5"""
    especialidad = request.args.get("especialidad", "").strip()
    limit = min(int(request.args.get("limit", 5)), 20)

    if not especialidad:
        return jsonify({"error": "Falta el parámetro 'especialidad'"}), 400

    data = get_ranking(especialidad, limit)
    if not data:
        # Sin ranking guardado: responde con datos semilla (siempre hay algo).
        # Así /miCV, /simular y /comparar funcionan sin correr /mercado antes.
        seed = SEED_DATA.get(especialidad.lower().strip(), DEFAULT_SEED)
        data = {
            "especialidad": especialidad.lower(),
            "skills": seed[:limit],
            "total_jobs": 100,
            "updatedAt": None,
            "source": "seed",
        }

    return jsonify(data)


# Tiempo que se consideran "frescos" los datos antes de re-scrapear
CACHE_HOURS = 24


def _is_fresh(updated_at_iso: str) -> bool:
    """True si la fecha ISO es de hace menos de CACHE_HOURS."""
    try:
        updated = datetime.fromisoformat(updated_at_iso)
        if updated.tzinfo is None:
            updated = updated.replace(tzinfo=timezone.utc)
        return datetime.now(timezone.utc) - updated < timedelta(hours=CACHE_HOURS)
    except (ValueError, TypeError):
        return False


@app.post("/scrape")
def scrape():
    """POST /scrape  body: { "especialidad": "datos-ia" }

    Si ya hay datos de hace menos de 24h, no vuelve a scrapear (responde cached).
    """
    body = request.get_json(silent=True) or {}
    especialidad = body.get("especialidad", "").strip()

    if not especialidad:
        return jsonify({"error": "Falta 'especialidad' en el body"}), 400

    # Cache hit: datos frescos en MongoDB, evita el scrape (responde en <1s)
    existing = get_ranking(especialidad, limit=1)
    if existing and _is_fresh(existing.get("updatedAt")):
        print(f"[SCRAPE] Cache hit para '{especialidad}' (datos de <{CACHE_HOURS}h)")
        return jsonify({"ok": True, "especialidad": especialidad, "cached": True})

    print(f"[SCRAPE] Scrapeando para: {especialidad}")
    data = scrape_occ(especialidad)
    save_ranking(especialidad, data)
    print(f"[SCRAPE] Guardado: {len(data['skills'])} skills para '{especialidad}'")

    return jsonify({
        "ok": True,
        "especialidad": especialidad,
        "cached": False,
        "skills_found": len(data["skills"]),
    })


@app.get("/especialidades")
def especialidades():
    return jsonify({"especialidades": list_especialidades()})


@app.get("/becas")
def becas():
    """GET /becas?especialidad=datos-ia&carrera=sistemas&limit=5

    Filtra y ordena por relevancia para la especialidad; carrera es secundaria.
    """
    especialidad = request.args.get("especialidad", "").strip()
    carrera = request.args.get("carrera", "").strip()
    limit = min(int(request.args.get("limit", 5)), 10)
    if not especialidad and not carrera:
        return jsonify({"error": "Falta 'especialidad' o 'carrera'"}), 400
    resultado = filtrar_becas(especialidad, carrera, limit)
    return jsonify({"becas": resultado, "total": len(resultado)})


# ---------------------------------------------------------------------------
# Cron semanal (cada lunes a las 6 AM) — re-scrapea todas las especialidades
# ---------------------------------------------------------------------------

def _weekly_scrape():
    todas = list_especialidades()
    print(f"[CRON] Semanal: {len(todas)} especialidades a scrapear")
    for esp in todas:
        try:
            data = scrape_occ(esp)
            save_ranking(esp, data)
            print(f"  [CRON] OK {esp}")
        except Exception as e:
            print(f"  [CRON] ERROR {esp}: {e}")


_scheduler = BackgroundScheduler()
_scheduler.add_job(_weekly_scrape, "cron", day_of_week="mon", hour=6, minute=0)
_scheduler.start()
atexit.register(lambda: _scheduler.shutdown())


# ---------------------------------------------------------------------------
if __name__ == "__main__":
    port = int(os.getenv("SCRAPER_PORT", 5001))
    print(f"[SCRAPER] Iniciando en http://localhost:{port}")
    app.run(host="0.0.0.0", port=port, debug=False)
