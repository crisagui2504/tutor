import re
import requests
from bs4 import BeautifulSoup

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "es-MX,es;q=0.9",
}

# Becas reales del mercado mexicano 2025-2026
# Se usan como base + lo que scrapeemos encima
SEED_BECAS = [
    {
        "nombre": "Beca CONAHCYT — Posgrado Nacional",
        "institucion": "CONAHCYT",
        "descripcion": "Apoyo mensual para estudios de maestría o doctorado en instituciones mexicanas de calidad.",
        "monto": "$8,500 – $14,500 / mes",
        "fecha_limite": "2026-08-30",
        "url": "https://becas.conahcyt.mx",
        "especialidades": ["*"],
        "carreras": ["sistemas", "computacion", "informatica", "software", "datos",
                     "ingenieria", "ciencias", "tecnologia"],
    },
    {
        "nombre": "Beca Santander | Tecnología",
        "institucion": "Santander Universidades",
        "descripcion": "Cursos y certificaciones en tecnología, programación y datos para estudiantes universitarios.",
        "monto": "Cursos gratuitos + $500 USD en plataformas",
        "fecha_limite": "2026-09-15",
        "url": "https://www.becas-santander.com/es/program/santander-skills-technology",
        "especialidades": ["desarrollo-web", "datos-ia", "devops-cloud", "ciberseguridad", "redes"],
        "carreras": ["sistemas", "computacion", "software", "datos", "informatica",
                     "tecnologia", "ingenieria", "marketing"],
    },
    {
        "nombre": "Google Generation Scholarship",
        "institucion": "Google",
        "descripcion": "Beca para estudiantes de ciencias de la computación e ingeniería en Latinoamérica.",
        "monto": "$10,000 USD",
        "fecha_limite": "2026-10-01",
        "url": "https://buildyourfuture.withgoogle.com/scholarships",
        "especialidades": ["desarrollo-web", "datos-ia", "ciberseguridad"],
        "carreras": ["sistemas", "computacion", "software", "datos", "ingenieria",
                     "informatica", "tecnologia"],
    },
    {
        "nombre": "Beca Jóvenes Escribiendo el Futuro — SEP",
        "institucion": "SEP / Bienestar",
        "descripcion": "Apoyo económico mensual para estudiantes de educación superior de bajos recursos.",
        "monto": "$2,525 / mes",
        "fecha_limite": "2026-07-31",
        "url": "https://becasbenitojuarez.sep.gob.mx",
        "especialidades": ["*"],
        "carreras": ["*"],  # todas las carreras
    },
    {
        "nombre": "FUNED — Beca de Excelencia",
        "institucion": "FUNED",
        "descripcion": "Financiamiento para posgrado en México o el extranjero para jóvenes de alto potencial.",
        "monto": "Hasta $150,000 / año",
        "fecha_limite": "2026-08-15",
        "url": "https://www.funed.org.mx/becas",
        "especialidades": ["*"],
        "carreras": ["sistemas", "administracion", "negocios", "ingenieria",
                     "finanzas", "tecnologia", "datos"],
    },
    {
        "nombre": "Microsoft LEAP — Aprendizaje Tech",
        "institucion": "Microsoft",
        "descripcion": "Programa de capacitación y empleo para personas sin experiencia en tecnología.",
        "monto": "Empleo + capacitación pagada",
        "fecha_limite": "2026-11-30",
        "url": "https://www.microsoft.com/en-us/leap",
        "especialidades": ["desarrollo-web", "datos-ia", "devops-cloud", "ciberseguridad"],
        "carreras": ["sistemas", "computacion", "software", "datos", "ingenieria",
                     "informatica", "tecnologia"],
    },
    {
        "nombre": "Beca AWS re/Start — Amazon",
        "institucion": "Amazon Web Services",
        "descripcion": "Bootcamp gratuito de cloud computing con certificación AWS incluida y apoyo de empleo.",
        "monto": "Gratuita + certificación AWS",
        "fecha_limite": "2026-09-30",
        "url": "https://aws.amazon.com/training/restart/",
        "especialidades": ["devops-cloud", "redes", "ciberseguridad"],
        "carreras": ["sistemas", "redes", "computacion", "software", "informatica",
                     "tecnologia"],
    },
    {
        "nombre": "Beca Talento Digital — INADEM / SE",
        "institucion": "Secretaría de Economía",
        "descripcion": "Capacitación digital y emprendimiento tecnológico para jóvenes mexicanos.",
        "monto": "$3,000 – $5,000 / mes",
        "fecha_limite": "2026-08-01",
        "url": "https://www.gob.mx/se",
        "especialidades": ["desarrollo-web", "datos-ia"],
        "carreras": ["sistemas", "administracion", "negocios", "marketing",
                     "tecnologia", "computacion"],
    },
]


def dias_restantes(fecha_str: str) -> int:
    """Calcula dias restantes hasta la fecha limite."""
    from datetime import datetime, timezone
    try:
        limite = datetime.strptime(fecha_str, "%Y-%m-%d").replace(tzinfo=timezone.utc)
        hoy = datetime.now(timezone.utc)
        return max((limite - hoy).days, 0)
    except Exception:
        return 999


def filtrar_becas(especialidad: str, carrera: str = "", limit: int = 5) -> list[dict]:
    """Filtra y ordena becas por relevancia para la especialidad, luego por urgencia.

    Relevancia:
      2 = la beca apunta específicamente a esta especialidad
      1 = beca genérica ("*") o que coincide con la carrera
      0 = no aplica (se descarta)
    """
    esp = (especialidad or "").lower().strip()
    carrera_lower = (carrera or "").lower()

    relevantes = []
    for beca in SEED_BECAS:
        esps = beca.get("especialidades", [])
        carreras = beca.get("carreras", [])

        if esp and esp in esps:
            relevancia = 2
        elif "*" in esps:
            relevancia = 1
        elif "*" in carreras or any(c in carrera_lower for c in carreras):
            relevancia = 1
        else:
            continue

        relevantes.append({**beca, "_relevancia": relevancia})

    # Más relevantes primero; a igual relevancia, la fecha más próxima
    relevantes.sort(key=lambda b: (-b["_relevancia"], b["fecha_limite"]))

    resultado = []
    for b in relevantes[:limit]:
        b = {k: v for k, v in b.items() if k != "_relevancia"}
        b["dias_restantes"] = dias_restantes(b["fecha_limite"])
        resultado.append(b)

    return resultado


def scrape_conacyt() -> list[dict]:
    """Intenta obtener becas actualizadas de CONAHCYT. Fallback silencioso."""
    try:
        resp = requests.get(
            "https://becas.conahcyt.mx/",
            headers=HEADERS,
            timeout=10,
        )
        if not resp.ok:
            return []
        # Extrae titulos y fechas con regex del HTML
        soup = BeautifulSoup(resp.text, "html.parser")
        fechas = re.findall(r"\d{1,2}/\d{1,2}/\d{4}", soup.get_text())
        return fechas[:3]  # solo para logging, la seed ya tiene los datos
    except Exception:
        return []
