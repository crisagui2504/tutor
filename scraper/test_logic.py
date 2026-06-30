"""Tests de la lógica pura del scraper (sin red ni base de datos).

Correr con:  cd scraper && python -m pytest   (o: python -m pytest scraper)
"""
from bs4 import BeautifulSoup

from extractor import extract_skills, rank_skills
from scraper import (
    especialidad_to_occ_queries,
    extract_jsonld_jobs,
    scrape_occ,
    SEED_DATA,
)
from becas import filtrar_becas, dias_restantes


# --- extractor ---------------------------------------------------------------

def test_extract_skills_encuentra_por_palabra():
    skills = extract_skills("Buscamos Python, SQL y Docker. React deseable.")
    assert "Python" in skills
    assert "SQL" in skills
    assert "Docker" in skills


def test_extract_skills_sin_falsos_positivos():
    # 'java' no debe matchear dentro de 'javascript'
    skills = extract_skills("Experiencia en JavaScript")
    assert "JavaScript" in skills
    assert "Java" not in skills


def test_rank_skills_ordena_por_frecuencia():
    listas = [["Python", "SQL"], ["Python"], ["Python", "Docker"]]
    ranking = rank_skills(listas, top_n=5)
    assert ranking[0]["skill"] == "Python"
    assert ranking[0]["count"] == 3
    assert ranking[0]["pct"] == 100


# --- mapeo de especialidades -------------------------------------------------

def test_especialidad_to_occ_queries_devuelve_lista():
    qs = especialidad_to_occ_queries("datos-ia")
    assert isinstance(qs, list)
    assert "data-scientist" in qs
    assert len(qs) >= 2


def test_especialidad_desconocida_cae_a_default():
    assert especialidad_to_occ_queries("nope") == ["desarrollador-web"]


def test_seed_data_tiene_las_cinco_especialidades():
    for esp in ["desarrollo-web", "datos-ia", "ciberseguridad", "devops-cloud", "redes"]:
        assert esp in SEED_DATA
        assert len(SEED_DATA[esp]) >= 5


# --- JSON-LD -----------------------------------------------------------------

def test_extract_jsonld_jobs_objeto_lista_y_graph():
    html = """
    <script type="application/ld+json">{"@type":"JobPosting","title":"Dev","description":"Python Django"}</script>
    <script type="application/ld+json">[{"@type":"JobPosting","title":"Data","description":"SQL"}]</script>
    <script type="application/ld+json">{"@graph":[{"@type":"WebSite"},{"@type":"JobPosting","title":"Ops","description":"Docker"}]}</script>
    <script type="application/ld+json">no es json</script>
    """
    jobs = extract_jsonld_jobs(BeautifulSoup(html, "html.parser"))
    assert len(jobs) == 3
    assert any("Django" in j for j in jobs)


def test_extract_jsonld_ignora_no_jobposting():
    html = '<script type="application/ld+json">{"@type":"Organization","name":"X"}</script>'
    assert extract_jsonld_jobs(BeautifulSoup(html, "html.parser")) == []


# --- scrape_occ: combinación de múltiples queries ---------------------------

def test_scrape_occ_combina_queries(monkeypatch):
    llamadas = []

    def fake(session, query, max_pages):
        llamadas.append(query)
        return [["Python", "SQL"]], 5, False

    monkeypatch.setattr("scraper._scrape_query", fake)
    r = scrape_occ("datos-ia")
    assert llamadas == ["data-scientist", "analista-de-datos", "data-engineer"]
    assert r["total_jobs"] == 15  # 3 queries x 5
    assert r["source"] == "live"


def test_scrape_occ_bloqueo_corta_y_cae_a_seed(monkeypatch):
    llamadas = []

    def fake_block(session, query, max_pages):
        llamadas.append(query)
        return [], 0, True

    monkeypatch.setattr("scraper._scrape_query", fake_block)
    r = scrape_occ("ciberseguridad")
    assert len(llamadas) == 1  # cortó al primer bloqueo
    assert r["source"] == "seed"


# --- becas -------------------------------------------------------------------

def test_dias_restantes_no_negativo():
    assert dias_restantes("2000-01-01") == 0  # fecha pasada -> 0
    assert dias_restantes("basura") == 999


def test_filtrar_becas_prioriza_especialidad():
    becas = filtrar_becas("datos-ia", "ing en sistemas", 5)
    assert len(becas) > 0
    # la primera debe ser específica de datos-ia o genérica, nunca irrelevante
    primera = becas[0]
    assert "datos-ia" in primera["especialidades"] or "*" in primera["especialidades"]
    # todas traen dias_restantes calculado
    assert all("dias_restantes" in b for b in becas)
