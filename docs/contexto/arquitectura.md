# Arquitectura

## Stack

| Capa | Tecnología | Versión mínima |
|------|-----------|----------------|
| Bot | Node.js + Telegraf.js | Node 20, Telegraf 4.x |
| Scraper / API | Python + Flask | Python 3.11 |
| Base de datos | MongoDB Atlas (tier M0) | pymongo 4.8 / mongoose 8.x |
| LLM | Groq API (Llama 3.3 70B) | nube, compatible con OpenAI |
| Scheduler Node | node-cron | 4.x |
| Scheduler Python | APScheduler | 3.10 |
| Logging Node | pino + pino-pretty | 9.x |
| PDF (CV) | pdfkit (JS puro, Times-Roman built-in) | 0.15.x |

## Mapa de carpetas

```
asistente/
├── src/                   # Bot Node.js
│   ├── index.js           # Entrypoint: comandos Telegraf, arranque
│   ├── config.js          # Carga y valida variables de entorno (falla rápido)
│   ├── logger.js          # Logger estructurado (pino, pretty en dev / JSON en prod)
│   ├── db.js              # Conexión mongoose + fix DNS Google
│   ├── models/
│   │   └── profile.js     # Esquema perfil + estado conversación
│   └── bot/
│       ├── states.js      # Enum de estados de la FSM
│       ├── especialidades.js # Taxonomía (especialidad/objetivo/nivel) — contrato con Python
│       ├── onboarding.js  # Pasos del onboarding (prompt + handle)
│       ├── cv_matcher.js  # COMPARA skills vs mercado (matchSkills, recordScore)
│       ├── cv_generator.js # ARMA el CV: mini-flujo /cv + Groq + PDF (PDFKit)
│       ├── planner.js     # Llama a Groq API para generar el plan
│       ├── quiz.js        # Quiz interactivo (Groq + Zod, estado en memoria)
│       ├── progreso.js    # Gráfica ASCII del historial de scores
│       └── scheduler.js   # Crons: check-in semanal + re-score mensual
├── scraper/               # API Python (puerto 5001)
│   ├── app.py             # Flask: /health /skills /scrape /careers /becas
│   ├── scraper.py         # Scrape OCC → fallback a SEED_DATA
│   ├── extractor.py       # SKILLS_CATALOG + extract_skills() + rank_skills()
│   ├── models.py          # pymongo: save_ranking / get_ranking / list_careers
│   ├── becas.py           # SEED_BECAS + filtrar_becas()
│   └── requirements.txt
├── docs/contexto/         # Esta carpeta
├── iniciar.bat            # Arranca ambos servicios con doble clic (Windows)
├── Procfile               # worker: npm start (Railway)
├── package.json           # ESM, scripts start/dev, dependencias
└── .env / .env.example
```

## Flujo de datos por comando

```
/start      → FSM onboarding → guarda perfil en MongoDB

/mercado    → POST /scrape (Python)
               └── scrape_occ() → OCC o SEED_DATA
               └── save_ranking() → MongoDB skill_rankings
            → GET /skills → respuesta al usuario

/miCV       → GET /skills
            → matchSkills(profile.habilidades, skills)
            → push score a profile.cvScores → guarda en MongoDB

/plan       → GET /skills → extrae missing skills
            → POST Groq /openai/v1/chat/completions (Llama 3.3 70B)
            → respuesta al usuario

/becas      → GET /becas (Python)
            → filtrar_becas(carrera) sobre SEED_BECAS
            → respuesta con semáforo de días

/progreso   → lee profile.cvScores (últimos 6)
            → generarGraficaProgreso() → gráfica ASCII

Cron lunes 9AM  → sendWeeklyCheckin() → botones inline a todos los usuarios
Cron día 1 mes  → monthlyRescore() → recalcula score, notifica si sube
Cron lunes 6AM  → _weekly_scrape() (Python APScheduler) → re-scrapea OCC
```

## Colecciones MongoDB

| Colección | Qué guarda |
|-----------|-----------|
| `profiles` | Un doc por usuario Telegram: perfil (incl. especialidad/objetivo/nivel) + estado FSM + historial de scores (con especialidad) |
| `skill_rankings` | Un doc por **especialidad**: top skills + total_jobs + fecha de actualización |

## Capa de especialidad (clave del diseño)

`especialidad` es la "capa de precisión" entre la carrera (string libre) y el resto
del bot. Las 5 keys (`desarrollo-web`, `datos-ia`, `ciberseguridad`, `devops-cloud`,
`redes`) son un **contrato compartido** entre `src/bot/especialidades.js` (Node) y
`ESPECIALIDAD_MAP` + `SEED_DATA` en `scraper/scraper.py` (Python). Cambiar una key
exige tocar ambos lados. Todo (`/mercado`, `/miCV`, `/plan`, `/becas`, `/progreso`)
se filtra por especialidad, no por carrera.

Cada especialidad mapea a **varios títulos de OCC** (ej. `datos-ia` → data-scientist,
analista-de-datos, data-engineer): `scrape_occ` itera sobre todos y combina los
resultados (con `max_pages=2` por título para no disparar tiempo ni bloqueos),
capturando una rebanada más realista del mercado que un solo slug.

## API del scraper (contrato HTTP)

| Endpoint | Parámetro clave |
|----------|-----------------|
| `POST /scrape` | body `{ especialidad }` (caché 24h) |
| `GET /skills` | `?especialidad=&limit=` — nunca 404: si no hay ranking, cae a SEED_DATA |
| `GET /becas` | `?especialidad=&carrera=&limit=` |
| `GET /especialidades` | (lista las que tienen ranking) |
| `GET /metrics` | métricas de uso en JSON (agrega la colección `profiles`) |
| `GET /dashboard` | dashboard HTML server-rendered; en navegador usar `?key=<API_SECRET_KEY>` |

## Qué NO existe

- Tests de integración/e2e de los comandos (sí hay unitarios de lógica pura: Vitest + pytest)
- Autenticación o autorización adicional (solo telegramId implícito)
- Rate limiting en el bot o en la API Flask
- Caché en memoria (Redis, etc.)
- Google Calendar integration (mencionada en README, no implementada)
- Panel de administración con autenticación de usuarios (sí hay un `/dashboard` de métricas protegido por API key)
- Logs estructurados / observabilidad (solo console.log / print)
- Multilenguaje (solo español)
- Variables de entorno en producción cloud (Railway no configurado todavía)
