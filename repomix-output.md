This file is a merged representation of the entire codebase, combined into a single document by Repomix.

# File Summary

## Purpose
This file contains a packed representation of the entire repository's contents.
It is designed to be easily consumable by AI systems for analysis, code review,
or other automated processes.

## File Format
The content is organized as follows:
1. This summary section
2. Repository information
3. Directory structure
4. Repository files (if enabled)
5. Multiple file entries, each consisting of:
  a. A header with the file path (## File: path/to/file)
  b. The full contents of the file in a code block

## Usage Guidelines
- This file should be treated as read-only. Any changes should be made to the
  original repository files, not this packed version.
- When processing this file, use the file path to distinguish
  between different files in the repository.
- Be aware that this file may contain sensitive information. Handle it with
  the same level of security as you would the original repository.

## Notes
- Some files may have been excluded based on .gitignore rules and Repomix's configuration
- Binary files are not included in this packed representation. Please refer to the Repository Structure section for a complete list of file paths, including binary files
- Files matching patterns in .gitignore are excluded
- Files matching default ignore patterns are excluded
- Files are sorted by Git change count (files with more changes are at the bottom)

# Directory Structure
```
.env.example
.gitignore
docs/contexto/arquitectura.md
docs/contexto/convenciones.md
docs/contexto/decisiones.md
docs/contexto/errores-conocidos.md
docs/contexto/flujo-de-trabajo.md
docs/contexto/glosario.md
iniciar.bat
package.json
Procfile
README.md
scraper/app.py
scraper/becas.py
scraper/extractor.py
scraper/models.py
scraper/requirements.txt
scraper/scraper.py
src/bot/cv_generator.js
src/bot/cv_matcher.js
src/bot/especialidades.js
src/bot/onboarding.js
src/bot/planner.js
src/bot/progreso.js
src/bot/scheduler.js
src/bot/states.js
src/config.js
src/db.js
src/index.js
src/logger.js
src/models/profile.js
```

# Files

## File: .env.example
````
# --- Telegram ---
# Token que te da @BotFather al crear el bot
BOT_TOKEN=123456:ABC-tu-token-aqui

# --- MongoDB Atlas (tier gratuito 512 MB) ---
# Cadena de conexion: Atlas > Connect > Drivers
MONGODB_URI=mongodb+srv://usuario:password@cluster0.xxxxx.mongodb.net/asistente?retryWrites=true&w=majority

# Entorno (development | production)
NODE_ENV=development

# Nivel de logs (trace | debug | info | warn | error) — opcional, default info
LOG_LEVEL=info

# --- Groq (LLM en la nube para /plan) ---
# Consigue tu key gratis en https://console.groq.com (Settings > API Keys)
GROQ_API_KEY=gsk_tu-key-aqui
GROQ_MODEL=llama-3.3-70b-versatile
````

## File: .gitignore
````
node_modules/
.env
*.log
.DS_Store

# Python
__pycache__/
*.pyc
.venv/
venv/

# Artefactos generados
repomix-output.*
*.pdf
````

## File: docs/contexto/arquitectura.md
````markdown
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

## API del scraper (contrato HTTP)

| Endpoint | Parámetro clave |
|----------|-----------------|
| `POST /scrape` | body `{ especialidad }` (caché 24h) |
| `GET /skills` | `?especialidad=&limit=` |
| `GET /becas` | `?especialidad=&carrera=&limit=` |
| `GET /especialidades` | (lista las que tienen ranking) |

## Qué NO existe

- Tests (unitarios, integración o e2e)
- Autenticación o autorización adicional (solo telegramId implícito)
- Rate limiting en el bot o en la API Flask
- Caché en memoria (Redis, etc.)
- Google Calendar integration (mencionada en README, no implementada)
- Panel de administración o dashboard
- Logs estructurados / observabilidad (solo console.log / print)
- Multilenguaje (solo español)
- Variables de entorno en producción cloud (Railway no configurado todavía)
````

## File: docs/contexto/convenciones.md
````markdown
# Convenciones

## Lenguaje y módulos

- **Node.js**: ESM puro (`"type": "module"` en package.json). Usar `import/export`, nunca `require()`.
- **Python**: módulos sueltos importados directamente (`from scraper import scrape_occ`), sin paquete instalable.
- **Idioma del código**: español para nombres de dominio (`perfil`, `carrera`, `horario`), inglés para infraestructura (`connectDB`, `matchSkills`, `save_ranking`).

## Naming

| Elemento | Convención | Ejemplo |
|----------|-----------|---------|
| Archivos Node | camelCase | `cv_matcher.js`, `onboarding.js` |
| Archivos Python | snake_case | `scraper.py`, `becas.py` |
| Funciones Node | camelCase | `matchSkills()`, `generatePlan()` |
| Funciones Python | snake_case | `filtrar_becas()`, `rank_skills()` |
| Constantes | UPPER_SNAKE | `STATES`, `SKILLS_CATALOG`, `SEED_DATA` |
| Colecciones Mongo | plural lowercase | `profiles`, `skill_rankings` |
| Variables de entorno | UPPER_SNAKE | `BOT_TOKEN`, `MONGODB_URI` |

## Estilo Node.js

- Sin punto y coma al final de línea (no hay linter configurado — [PENDIENTE: añadir ESLint])
- Arrow functions para callbacks cortos; `async function` con nombre para handlers de comandos
- Mensajes de Telegram con template literals; `parse_mode: 'Markdown'` para negritas/cursivas
- Límite de 4096 caracteres por mensaje Telegram: cortar si el plan supera la mitad del límite

## Estilo Python

- Type hints en firmas de funciones (`def filtrar_becas(carrera: str, limit: int) -> list[dict]`)
- Docstring de una línea cuando el propósito no es obvio; sin docstrings extensos
- `load_dotenv()` al inicio de cada módulo raíz que acceda a env vars

## Patrones que usamos

- **FSM en MongoDB**: el estado de conversación vive en `profile.conversationState`, no en memoria. Permite reinicios sin perder contexto.
- **Fail-fast en config**: `config.js` llama a `process.exit(1)` si falta una env var requerida.
- **Seed data como fallback**: cuando el scraper es bloqueado, se devuelven datos reales precargados en vez de error.
- **Alias normalization**: `cv_matcher.js` normaliza abreviaciones antes de comparar (`js → JavaScript`).
- **Fix DNS global**: tanto Node (`dns.setServers`) como Python (`dns.resolver.default_resolver`) fuerzan Google DNS al arranque.

## Patrones prohibidos

- No usar `require()` en Node (rompe ESM).
- No guardar estado de conversación en variables globales (se perdería al reiniciar).
- No hacer `import *` en Python (dificulta rastrear dependencias).
- No usar emojis en `print()` de Python sin `chcp 65001` o `PYTHONIOENCODING=utf-8` (rompe en Windows cp1252).
- No llamar a `bot.launch()` desde más de un proceso (conflicto de polling).

## Logging

- **Node**: usar `logger` de `src/logger.js` (pino), nunca `console.log`/`console.error`.
  Formato `logger.info({ campo: valor }, 'mensaje')` — el objeto va primero. Pretty en
  desarrollo, JSON en producción. Excepción: `config.js` usa `console.error` a propósito
  (fallo de arranque antes de que exista el logger).
- **Python**: `print()` con prefijo `[SCRAPE]`, `[SCRAPER]`, etc. (sin emojis nuevos).

## Rate limiting

- Comandos pesados pasan por `isRateLimited(telegramId, comando, segundos)` en `index.js`:
  `/plan` 60s, `/mercado` y `/miCV` 30s. Map en memoria, se reinicia con el bot.

## Tests

[PENDIENTE: no hay tests. Si se añaden, usar Jest para Node y pytest para Python.]

## Commits

[PENDIENTE: no hay git en el directorio del proyecto. Si se inicializa, usar Conventional Commits: `feat:`, `fix:`, `chore:`.]
````

## File: docs/contexto/decisiones.md
````markdown
# Decisiones técnicas

## 0. Capa de especialidad entre carrera y todo lo demás

**Decisión**: agregar un campo `especialidad` (5 opciones) que dirige mercado, CV, plan y becas, en vez de tratar la carrera libre como única señal.
**Por qué**: "Ingeniería en Sistemas" es un paraguas de 6-7 trayectorias distintas. Sin especialidad, un estudiante de ciberseguridad recibía un plan de React/Node y becas de diseño. La especialidad es la mínima señal que hace todo lo demás relevante.
**Implementación**: keys kebab-case compartidas entre `src/bot/especialidades.js` (Node) y `scraper.py` (Python). El ranking de skills se indexa por especialidad, no por carrera. Onboarding gana `ASK_ESPECIALIDAD` (requerido), `ASK_OBJETIVO` (opcional) y `ASK_NIVEL` (3 puntos).
**Migración**: perfiles viejos sin especialidad pasan por `requireEspecialidad()` (gate suave) la primera vez que usan un comando — eligen sin rehacer el onboarding.
**Descartado**: inferir la especialidad del texto libre de la carrera — demasiado ambiguo y no captura hacia dónde *quiere* ir el estudiante (distinto de lo que estudia).

## 0.1. CV en PDF con PDFKit (no HTML→PDF ni solo texto)

**Decisión**: `/cv` genera un PDF estilo Harvard con PDFKit.
**Por qué**: PDFKit es JS puro (sin Chromium ni binarios nativos) y trae Times-Roman incorporada — justo la fuente del estilo Harvard. Da el producto final real sin el peso de Puppeteer ni el costo de dependencias que tendría la ruta HTML→PDF.
**Arquitectura**: el contenido lo estructura Groq en JSON (resumen + skills categorizadas + proyectos pulidos), con **fallback determinista** (categorización local) si Groq falla — `/cv` nunca queda sin entregar. La maquetación es 100% determinista en `cv_generator.js`.
**Separación**: `cv_matcher.js` COMPARA skills vs mercado; `cv_generator.js` ARMA el documento. Responsabilidades distintas, archivos distintos.
**Descartado**: (a) solo texto Markdown — menos profesional para mandar a empresas; (b) HTML→PDF con Puppeteer — descarga ~300MB de Chromium y es frágil en Windows.

## 1. Dos servicios separados (Node + Python) en vez de uno solo

**Decisión**: el bot corre en Node.js y el scraper/API en Python Flask.
**Por qué**: las mejores librerías de scraping (BeautifulSoup, requests) y de NLP son Python. Telegraf.js es la mejor opción para bots de Telegram en Node. Mezclar ambos en un solo proceso habría requerido child_process o un puente incómodo.
**Descartado**: un bot puramente Python (python-telegram-bot) — Telegraf.js tiene mejor DX y más ejemplos para máquinas de estado.

## 2. Estado de conversación persistido en MongoDB (no en memoria)

**Decisión**: `profile.conversationState` se guarda en la base de datos en cada transición.
**Por qué**: si el proceso muere o se reinicia (Railway, reinicio manual), el usuario retoma donde lo dejó. Un Map en memoria lo perdería.
**Descartado**: sesiones en Redis — añade infraestructura extra innecesaria para el volumen actual.

## 3. Groq API (Llama 3.3 70B) para generar el plan

**Decisión**: el plan de estudios se genera con la API de Groq (compatible con OpenAI).
**Por qué**: respuesta en ~1 segundo, modelo grande (Llama 3.3 70B) muy superior a gemma local, free tier generoso, y no ocupa recursos de la PC del usuario.
**Evolución**:
- Primero se intentó **Gemini API** — free tier con cuota 0 sin tarjeta de crédito (429); claves nuevas formato `AQ.Ab8R...` daban 404 en varios modelos.
- Luego se usó **Ollama local (gemma3:1b → gemma4)** — funcionaba sin costo pero lento (15-30s) y requería tener Ollama corriendo en la PC.
- Finalmente **Groq** — más rápido, mejor calidad, sin proceso local.
**Config**: `GROQ_API_KEY` y `GROQ_MODEL` en `.env`. La llamada vive en `src/bot/planner.js`.

## 4. SEED_DATA como fallback del scraper OCC

**Decisión**: `scraper.py` tiene datos reales precargados (OCC/LinkedIn 2024-2025) y los usa cuando OCC bloquea la petición.
**Por qué**: OCC sirve contenido renderizado por JS que BeautifulSoup no puede parsear; además devuelve 403/captcha con frecuencia. Sin fallback el comando `/mercado` nunca funcionaría.
**Descartado**: Selenium/Playwright — añade complejidad y requiere Chrome instalado; seleniumbase ya causó conflicto de versión con beautifulsoup4.

## 5. Regex keyword matching para extracción de skills (sin spaCy)

**Decisión**: `extractor.py` usa `re.search(r'\b<skill>\b', text)` contra un catálogo fijo.
**Por qué**: spaCy requiere descargar modelos en español (~500 MB) y no mejora el resultado para una lista cerrada de palabras técnicas.
**Descartado**: spaCy NER — mencionado en el README original pero no implementado.

## 6. Alias normalization en cliente (Node) en vez de en el scraper (Python)

**Decisión**: `cv_matcher.js` normaliza `js → JavaScript` antes de comparar con el mercado.
**Por qué**: el scraper devuelve nombres canónicos (`JavaScript`, `Node.js`); el usuario escribe abreviaciones. Normalizar en el cliente evita contaminar los datos almacenados.

## 7. Fix DNS forzado en ambos servicios

**Decisión**: `dns.setServers(['8.8.8.8', '8.8.4.4'])` en Node y `dns.resolver.default_resolver` en Python al arranque.
**Por qué**: el DNS local de Windows no resuelve registros SRV de MongoDB Atlas (`_mongodb._tcp.cluster.mongodb.net`). Sin el fix, ambos servicios fallan al conectar.
**Descartado**: cambiar el DNS del sistema — afectaría otras aplicaciones; el fix in-process es quirúrgico.

## 8. `--dns-result-order=ipv4first` para Telegram API

**Decisión**: el script `npm start` incluye este flag de Node.
**Por qué**: sin él, Node resuelve `api.telegram.org` como IPv6, que en muchas redes locales de Windows no tiene ruta, causando que `bot.launch()` se quede colgado.

## 9. `concurrently` para arrancar ambos servicios juntos

**Decisión**: `npm start` usa `concurrently` con prefijos de color para correr bot y scraper.
**Por qué**: simplifica el arranque a un solo comando (o doble clic en `iniciar.bat`). Antes requería dos terminales.
**Descartado**: Docker Compose — añade complejidad innecesaria para desarrollo local en Windows.

## 10. Becas como seed data (no scraping en tiempo real)

**Decisión**: `becas.py` tiene un catálogo fijo de becas reales 2025-2026.
**Por qué**: los sitios de becas (CONAHCYT, FUNED, SEP) cambian estructura frecuentemente y muchos requieren JS para renderizar. El scraping en tiempo real tendría una tasa de fallo alta.
**Descartado**: Google Calendar integration — mencionada en el spec original, no implementada por complejidad de OAuth.
````

## File: docs/contexto/errores-conocidos.md
````markdown
# Errores conocidos y gotchas

## 1. MongoDB Atlas — fallo de DNS con SRV

**Síntoma**: `querySrv ECONNREFUSED` o `querySrv ETIMEOUT` al arrancar.
**Causa**: el DNS local de Windows no resuelve `_mongodb._tcp.*.mongodb.net`.
**Fix activo**: `dns.setServers(['8.8.8.8', '8.8.4.4'])` en `src/db.js` y `dns.resolver.default_resolver` en `scraper/models.py`.
**Si reaparece**: verificar que ningún firewall o VPN esté bloqueando el puerto 53 hacia 8.8.8.8.

## 2. Bot colgado en `bot.launch()` sin error

**Síntoma**: la consola queda parada en "Lanzando bot..." sin avanzar.
**Causa**: Node resuelve `api.telegram.org` como IPv6 y no hay ruta IPv6 en la red local.
**Fix activo**: `--dns-result-order=ipv4first` en el script `npm start` de `package.json`.
**Si reaparece**: verificar que el flag siga en el script y que no haya otro proceso Node corriendo el bot en paralelo.

## 3. Dos procesos Node en conflicto

**Síntoma**: los comandos (`/plan`, `/becas`) responden con el mensaje del handler de texto genérico ("Escribe /start...").
**Causa**: hay dos instancias del bot corriendo simultáneamente; una captura el update antes que la otra.
**Fix**: antes de reiniciar, cerrar todos los procesos Node desde el Administrador de tareas o con `Stop-Process -Name node` en PowerShell.

## 4. UnicodeEncodeError en Python (Windows)

**Síntoma**: `UnicodeEncodeError: 'charmap' codec can't encode character '\U0001f680'`.
**Causa**: la consola de Windows usa codepage cp1252 por defecto y no puede imprimir emojis.
**Fix activo**: `chcp 65001` + `PYTHONIOENCODING=utf-8` en `iniciar.bat`; `py -X utf8` en el script npm.
**Regla**: no añadir emojis en `print()` de Python si se va a correr en Windows sin estos fixes.

## 5. OCC devuelve 0 skills (scraper bloqueado)

**Síntoma**: `/mercado` muestra datos pero `source: "seed"` en los logs.
**Causa**: OCC detecta el scraper y devuelve captcha o 403. Ocurre casi siempre.
**Comportamiento esperado**: el sistema cae al `SEED_DATA` automáticamente. No es un error, es el flujo normal.
**Limitación**: los datos de seed son de 2024-2025 y no se actualizan solos.

## 6. `/plan` falla con error de Groq

**Síntoma**: el bot responde "Hubo un error al generar el plan. Verifica que GROQ_API_KEY esté configurado."
**Causas posibles**:
- `GROQ_API_KEY` no está en `.env` o está vencida/revocada.
- El modelo en `GROQ_MODEL` ya no existe (Groq deprecia modelos; verificar en console.groq.com).
- Se agotó el rate limit del free tier (poco común).
**Fix**: verificar la key en https://console.groq.com y que `GROQ_MODEL` sea un modelo activo (ej. `llama-3.3-70b-versatile`).
**Nota**: ya NO se usa Ollama. No hace falta tener nada corriendo localmente para `/plan`.

## 8. `scraper/__pycache__` no existe → no instala dependencias Python

**Síntoma**: `iniciar.bat` no instala requirements.txt aunque es la primera vez.
**Causa**: la condición `if not exist "scraper\__pycache__"` es un proxy imperfecto para "¿están instaladas las dependencias?".
**Workaround**: si las dependencias no están, ejecutar manualmente `py -m pip install -r scraper\requirements.txt`.

## 9. Conflicto de versiones BeautifulSoup / seleniumbase

**Síntoma**: `pip install` falla con conflicto de versiones.
**Causa**: seleniumbase requiere `beautifulsoup4~=4.15.0`; versiones anteriores o posteriores rompen.
**Fix activo**: `requirements.txt` fija `beautifulsoup4==4.15.0` y `requests==2.34.2`.
**Regla**: no actualizar estas versiones sin verificar compatibilidad con seleniumbase.

## 10. `/progreso` con entradas duplicadas del mismo mes — RESUELTO

**Antes**: `/miCV` hacía `push` del score en cada llamada, duplicando la entrada del mes.
**Fix activo**: `recordScore(profile, score)` en `cv_matcher.js` hace upsert por mes-año:
si ya hay medición de este mes la actualiza (refleja mejoras), si no la agrega. Usado
tanto por `/miCV` como por el re-score mensual del scheduler.

## 11. Semáforo de becas con fechas vencidas

**Síntoma**: una beca puede mostrar `0 días` si su `fecha_limite` ya pasó.
**Causa**: `SEED_BECAS` tiene fechas fijas; no se actualiza automáticamente.
**Fix**: actualizar manualmente las fechas en `scraper/becas.py` cuando venzan.
````

## File: docs/contexto/flujo-de-trabajo.md
````markdown
# Flujo de trabajo

## Arranque local

1. Doble clic en `iniciar.bat` — arranca bot (Node) y scraper (Python) juntos.
   (Ya NO hace falta Ollama: `/plan` usa Groq en la nube.)
2. Espera ver en la consola:
   ```
   [BOT]     ✅ Conectado a MongoDB
   [BOT]     🤖 Bot en marcha.
   [BOT]     ⏰ Scheduler iniciado
   [SCRAPER] [SCRAPER] Iniciando en http://localhost:5001
   ```
4. Abre Telegram y envía `/start` a tu bot.

## Hacer un cambio en el bot (Node.js)

1. Edita el archivo correspondiente en `src/`.
2. Cierra la ventana de `iniciar.bat` (Ctrl+C o cerrar).
3. Abre de nuevo `iniciar.bat`.
4. Prueba el comando afectado en Telegram.

> Para cambios de solo prueba puedes usar `npm run dev` (watch mode) en lugar de `iniciar.bat`, pero el scraper Python deberás arrancarlo aparte con `py scraper/app.py`.

## Hacer un cambio en el scraper (Python)

1. Edita el archivo en `scraper/`.
2. Reinicia desde `iniciar.bat` (igual que arriba).
3. Prueba con `curl http://localhost:5001/health` para verificar que levantó.

## Agregar una pregunta al onboarding

1. Añade el nuevo estado en `src/bot/states.js` (en el enum `STATES`).
2. Añade la entrada `{ prompt, handle }` en `src/bot/onboarding.js`.
3. Conecta la transición: el `handle` del estado anterior debe devolver `next: STATES.NUEVO_ESTADO`.
4. Si el dato necesita guardarse, agrégalo al schema en `src/models/profile.js`.

## Agregar una pregunta al mini-flujo de /cv

El flujo de `/cv` vive en estados `CV_*` separados del onboarding (en
`cv_generator.js`, registro `cvSteps`). Para agregar una pregunta: añade el
estado en `states.js`, su entrada en `cvSteps`, y encadena el `next`. El último
paso devuelve `{ ok, generateCV: true }` en vez de `next` para disparar el PDF.

## Agregar un comando nuevo al bot

1. Agrega el handler en `src/index.js`:
   ```js
   bot.command('micomando', async (ctx) => { ... });
   ```
2. Registra el comando en BotFather si debe aparecer en el menú de Telegram.

## Agregar una carrera al scraper

1. En `scraper/scraper.py`, agrega la entrada en `CARRERA_MAP`:
   ```python
   "mi carrera": "slug-de-occ",
   ```
2. Si OCC no tiene un slug adecuado, agrega también un array en `SEED_DATA` con los mismo formato que los existentes.

## Checklist de "terminado"

- [ ] El comando funciona end-to-end en Telegram (no solo en código)
- [ ] Los mensajes son legibles en móvil (no se cortan, el Markdown cierra bien)
- [ ] Si hay un nuevo campo en el perfil, está en el schema de Mongoose con default
- [ ] Si hay una nueva env var, está en `.env.example`
- [ ] Los `print()` de Python no usan emojis (o el bat ya tiene `chcp 65001`)
- [ ] No hay procesos Node anteriores corriendo (verificar con Administrador de tareas)

## Deploy en Railway

[PENDIENTE: Railway no está configurado todavía.]

Pasos conocidos (del README):
1. Subir repo a GitHub.
2. Railway → New Project → Deploy from GitHub.
3. Añadir variables: `BOT_TOKEN`, `MONGODB_URI`, `NODE_ENV=production`, `SCRAPER_URL`.
4. El `Procfile` ya tiene `worker: npm start`.
5. El servicio Python necesita un segundo servicio en Railway con `py scraper/app.py`.
````

## File: docs/contexto/glosario.md
````markdown
# Glosario

## Entidades del dominio

| Término | Definición |
|---------|-----------|
| **Perfil** | Documento MongoDB que representa a un estudiante. Contiene sus datos personales, habilidades, horario, estado de conversación e historial de scores. Una sola colección: `profiles`. |
| **Carrera** | String libre que el usuario escribe durante el onboarding. Ej: `"ing en sistemas computacionales"`. Es secundaria: la **especialidad** es la que dirige el bot. |
| **Especialidad** | La "capa de precisión" entre carrera y todo lo demás. Una de 5 keys kebab-case: `desarrollo-web`, `datos-ia`, `ciberseguridad`, `devops-cloud`, `redes`. Dirige mercado, CV, plan y becas. Definida en `src/bot/especialidades.js` (Node) y `ESPECIALIDAD_MAP`/`SEED_DATA` (Python) — **contrato compartido, las keys deben coincidir**. |
| **Objetivo** | Tipo de empresa donde quiere trabajar (opcional): `startup`, `corporativo`, `gobierno`, `freelance`, `emprendimiento`. Afina el plan. |
| **Nivel** | Nivel técnico autopercibido (3 puntos): `principiante`, `intermedio`, `avanzado`. Ajusta la dificultad del plan. |
| **Habilidades** | Array de strings que el usuario declara tener. Ej: `["JavaScript", "SQL", "Git"]`. Se normalizan con `ALIASES` antes de comparar con el mercado. |
| **Horario** | Mapa `{ dia: "HH:MM-HH:MM" }` de disponibilidad semanal del estudiante. Se usa para personalizar el plan de estudios. Ej: `{ lunes: "19:00-21:00" }`. |
| **Score** | Porcentaje (0-100) de compatibilidad entre las habilidades del usuario y el top de skills del mercado. Se calcula en `matchSkills()` y se guarda en `cvScores`. |
| **Beca** | Convocatoria de apoyo económico o capacitación. Tiene `nombre`, `institucion`, `monto`, `fecha_limite`, `url` y lista de `carreras` compatibles. |
| **Ranking** | Documento en la colección `skill_rankings`: lista ordenada de skills con su frecuencia (`count`) y porcentaje (`pct`) en vacantes de OCC para una carrera dada. |

## Siglas y abreviaciones internas

| Sigla | Significado |
|-------|------------|
| **FSM** | Finite State Machine — máquina de estados finita que guía el onboarding conversacional |
| **SEED_DATA** | Datos de mercado precargados en `scraper.py` como fallback cuando OCC bloquea el scraper |
| **SEED_BECAS** | Catálogo fijo de becas reales 2025-2026 en `becas.py` |
| **ALIASES** | Mapa de normalización de abreviaciones de skills en `cv_matcher.js` (`js → JavaScript`) |
| **CARRERA_MAP** | Mapa de nombres de carrera a slugs de OCC en `scraper.py` (`sistemas → desarrollador-de-software`) |
| **SKILLS_CATALOG** | Lista de ~60 skills reconocibles en `extractor.py`, base del keyword matching |
| **OCC** | OCC Mundial — portal de empleo mexicano scrapeado para obtener datos del mercado |
| **SRV** | Tipo de registro DNS que MongoDB Atlas usa para su cadena de conexión `mongodb+srv://` |

## Estados de la conversación (FSM)

| Estado | Qué espera el bot |
|--------|------------------|
| `NEW` | Usuario recién creado, no ha empezado |
| `ASK_NOMBRE` | Nombre del estudiante |
| `ASK_CARRERA` | Carrera que estudia |
| `ASK_ESPECIALIDAD` | Especialidad (menú numerado, dirige el bot) |
| `ASK_OBJETIVO` | Tipo de empresa (opcional, 0 = saltar) |
| `ASK_SEMESTRE` | Semestre actual (1-14) |
| `ASK_PROMEDIO` | Promedio (0-10) |
| `ASK_HABILIDADES` | Skills separadas por coma |
| `ASK_NIVEL` | Nivel autopercibido (3 puntos) |
| `ASK_HORARIO` | Días y rangos horarios |
| `DONE` | Onboarding completo |
| `EDIT_HABILIDADES` | Edición puntual de skills (vuelve a DONE) |
| `EDIT_HORARIO` | Edición puntual de horario (vuelve a DONE) |
| `EDIT_ESPECIALIDAD` | Edición/migración de especialidad (vuelve a DONE) |
| `CV_ASK_PROYECTOS` → `CV_ASK_LOGROS` → `CV_ASK_LINKS` → `CV_ASK_EMAIL` | Mini-flujo de `/cv`; el último genera el PDF y vuelve a DONE |

## Comandos del bot

| Comando | Función |
|---------|---------|
| `/start` | Inicia o reinicia el onboarding |
| `/perfil` | Muestra el perfil guardado |
| `/especialidad` | Cambia la especialidad (recalcula mercado/CV/plan/becas) |
| `/habilidades` | Edita solo las habilidades sin rehacer el onboarding |
| `/horario` | Edita solo la disponibilidad sin rehacer el onboarding |
| `/mercado` | Top 5 skills más pedidas para la carrera |
| `/miCV` | Score de compatibilidad CV vs mercado |
| `/plan` | Plan de estudios de 8 semanas con Groq |
| `/becas` | Becas filtradas por carrera con días restantes |
| `/progreso` | Gráfica ASCII del historial de scores |
| `/cv` | Genera un CV estilo Harvard en PDF (mini-flujo de 4 preguntas) |
````

## File: iniciar.bat
````batch
@echo off
chcp 65001 >nul
title Asistente de Carrera Bot
cd /d "%~dp0"
set PYTHONIOENCODING=utf-8
set PYTHONUTF8=1
echo.
echo  ====================================
echo   Asistente de Carrera - Iniciando
echo  ====================================
echo.

REM Verifica que Node y Python esten instalados
where node >nul 2>&1 || (echo ERROR: Node.js no encontrado. Instala desde nodejs.org && pause && exit)
where py >nul 2>&1 || (echo ERROR: Python no encontrado. Instala desde python.org && pause && exit)

REM Instala dependencias si no existen
if not exist "node_modules" (
    echo Instalando dependencias Node...
    npm install --no-audit --no-fund
)
if not exist "scraper\__pycache__" (
    echo Instalando dependencias Python...
    py -m pip install -r scraper\requirements.txt -q
)

echo Arrancando bot y scraper...
echo (Cierra esta ventana para detener todo)
echo.
npm start
pause
````

## File: package.json
````json
{
  "name": "asistente-carrera-bot",
  "version": "0.1.0",
  "description": "Bot de Telegram que hace onboarding inteligente, diagnostico de brechas y plan de estudios personalizado para estudiantes.",
  "type": "module",
  "main": "src/index.js",
  "scripts": {
    "start": "concurrently --names \"BOT,SCRAPER\" --prefix-colors \"cyan,yellow\" \"node --dns-result-order=ipv4first src/index.js\" \"py -X utf8 scraper/app.py\"",
    "bot": "node --dns-result-order=ipv4first src/index.js",
    "scraper": "py scraper/app.py",
    "dev": "concurrently --names \"BOT,SCRAPER\" --prefix-colors \"cyan,yellow\" \"node --dns-result-order=ipv4first --watch src/index.js\" \"py scraper/app.py\""
  },
  "engines": {
    "node": ">=20"
  },
  "dependencies": {
    "@google/genai": "^2.10.0",
    "dotenv": "^16.4.5",
    "mongoose": "^8.5.1",
    "node-cron": "^4.5.0",
    "pdfkit": "^0.19.1",
    "pino": "^10.3.1",
    "pino-pretty": "^13.1.3",
    "telegraf": "^4.16.3"
  },
  "devDependencies": {
    "concurrently": "^10.0.3"
  }
}
````

## File: Procfile
````
worker: npm start
````

## File: README.md
````markdown
# Asistente de Carrera — Bot de Telegram

Bot que conoce al estudiante mediante un onboarding conversacional, detecta sus
brechas de habilidades frente al mercado laboral **de su especialidad**, le arma
un plan de estudios personalizado con IA, le encuentra becas y le genera un CV
estilo Harvard en PDF.

> Documentación detallada (arquitectura, convenciones, decisiones, glosario,
> flujo de trabajo y gotchas) en [`docs/contexto/`](docs/contexto/).

## Stack

- **Node.js 20+** + **Telegraf.js** — bot de Telegram
- **Python 3.11 + Flask** — scraper de mercado y API de skills/becas (puerto 5001)
- **MongoDB Atlas** — perfil del estudiante y rankings de skills
- **Groq (Llama 3.3 70B)** — genera el plan de estudios y estructura el CV
- **PDFKit** — CV estilo Harvard en PDF (JS puro, Times-Roman incluido)
- **pino** — logging estructurado · **node-cron / APScheduler** — tareas programadas

## La capa de especialidad

El bot no trata "Ingeniería en Sistemas" como una sola cosa: pregunta una
**especialidad** (desarrollo web, datos/IA, ciberseguridad, DevOps/cloud, redes)
que dirige todo — mercado, diagnóstico de CV, plan y becas. Las keys son un
contrato compartido entre `src/bot/especialidades.js` (Node) y `scraper.py` (Python).

## Comandos

| Comando | Qué hace |
| --- | --- |
| `/start` | Onboarding conversacional (perfil + especialidad + nivel) |
| `/perfil` | Muestra el perfil guardado |
| `/especialidad` | Cambia la especialidad (recalcula todo) |
| `/habilidades` · `/horario` | Edita un campo sin rehacer el onboarding |
| `/mercado` | Top skills más pedidas en tu especialidad |
| `/miCV` | Diagnóstico de compatibilidad CV vs mercado |
| `/plan` | Plan de estudios de 8 semanas (IA, recursos por especialidad) |
| `/becas` | Becas filtradas por especialidad con fecha límite |
| `/progreso` | Gráfica de evolución de tu compatibilidad |
| `/cv` | CV estilo Harvard en PDF (mini-flujo de 4 preguntas) |

## Arquitectura

Dos servicios que se comunican por HTTP:

```
src/                      Bot Node.js (Telegraf, ESM)
├── index.js              Entrypoint: comandos + driver de la FSM
├── config.js             Carga/valida variables de entorno (falla rápido)
├── logger.js             Logging estructurado (pino)
├── db.js                 Conexión a MongoDB (fix DNS Google)
├── models/profile.js     Esquema del perfil + estado de conversación
└── bot/
    ├── states.js         Estados de la FSM
    ├── especialidades.js Taxonomía especialidad/objetivo/nivel (contrato con Python)
    ├── onboarding.js     Pasos del onboarding (prompt + handle)
    ├── cv_matcher.js     COMPARA skills vs mercado (matchSkills, recordScore)
    ├── cv_generator.js   ARMA el CV: mini-flujo /cv + Groq + PDF (PDFKit)
    ├── planner.js        Genera el plan con Groq
    ├── progreso.js       Gráfica ASCII del historial de scores
    └── scheduler.js      Crons: check-in semanal + re-score mensual

scraper/                  API Python (Flask, puerto 5001)
├── app.py                Endpoints: /skills /scrape /becas /especialidades
├── scraper.py            Scrape OCC → fallback a SEED_DATA por especialidad
├── extractor.py          Catálogo de skills + keyword matching
├── becas.py              Catálogo de becas + filtrado por relevancia
└── models.py             Persistencia (pymongo, fix DNS Google)
```

El onboarding es una **máquina de estados** persistida en MongoDB: el bot retoma
la conversación aunque se reinicie. Para agregar una pregunta basta con añadir el
estado en `states.js` y su entrada en `onboarding.js`.

## Puesta en marcha (local, Windows)

1. Crea el bot en Telegram con [@BotFather](https://t.me/BotFather) → copia el token.
2. Crea un cluster gratis en [MongoDB Atlas](https://www.mongodb.com/atlas), un
   usuario de BD y permite tu IP → copia la cadena de conexión.
3. Consigue una API key gratis en [console.groq.com](https://console.groq.com).
4. Configura el entorno:
   ```bash
   cp .env.example .env
   # edita .env con BOT_TOKEN, MONGODB_URI y GROQ_API_KEY
   ```
5. Instala dependencias y arranca **ambos servicios** con un doble clic en
   `iniciar.bat` (o `npm start`, que lanza bot + scraper con `concurrently`).
6. Abre tu bot en Telegram y envía `/start`.

## Variables de entorno

| Variable | Requerida | Para qué |
| --- | --- | --- |
| `BOT_TOKEN` | sí | Token de BotFather |
| `MONGODB_URI` | sí | Conexión a MongoDB Atlas |
| `GROQ_API_KEY` | sí (para `/plan` y `/cv`) | LLM en la nube |
| `GROQ_MODEL` | no | Modelo Groq (default `llama-3.3-70b-versatile`) |
| `SCRAPER_URL` | no | URL del scraper (default `http://localhost:5001`) |
| `LOG_LEVEL` | no | Nivel de logs (default `info`) |

## Despliegue en Railway

1. Sube este repo a GitHub.
2. Railway → *New Project* → *Deploy from GitHub*.
3. Agrega las variables de entorno (incluido `NODE_ENV=production`).
4. El `Procfile` ya define `worker: npm start`. El scraper Python necesita un
   segundo servicio (`py scraper/app.py`).
````

## File: scraper/app.py
````python
import atexit
import os
from datetime import datetime, timezone, timedelta
from flask import Flask, jsonify, request
from apscheduler.schedulers.background import BackgroundScheduler
from dotenv import load_dotenv

from scraper import scrape_occ
from models import save_ranking, get_ranking, list_especialidades
from becas import filtrar_becas

load_dotenv()

app = Flask(__name__)


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
        return jsonify({
            "error": f"No hay datos para '{especialidad}'. Llama a POST /scrape primero."
        }), 404

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
````

## File: scraper/becas.py
````python
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
````

## File: scraper/extractor.py
````python
import re
from collections import Counter

# Catalogo de skills del mercado tech mexicano (OCC / LinkedIn)
SKILLS_CATALOG = [
    # Lenguajes
    "Python", "Java", "JavaScript", "TypeScript", "C#", "C++", "PHP",
    "Ruby", "Go", "Kotlin", "Swift", "Rust", "Scala", "R",
    # Frontend
    "React", "Angular", "Vue", "Next.js", "Nuxt", "HTML", "CSS",
    "SASS", "Bootstrap", "Tailwind", "jQuery",
    # Backend
    "Node.js", "Django", "Flask", "FastAPI", "Spring Boot", "Laravel",
    "Express", "NestJS", ".NET", "ASP.NET",
    # Bases de datos
    "SQL", "MySQL", "PostgreSQL", "MongoDB", "Redis", "Oracle",
    "SQL Server", "MariaDB", "Cassandra", "Elasticsearch", "DynamoDB",
    # Cloud / DevOps
    "AWS", "Azure", "GCP", "Google Cloud", "Docker", "Kubernetes",
    "Git", "GitHub", "GitLab", "CI/CD", "Jenkins", "Terraform",
    "Linux", "Bash", "Ansible",
    # Data
    "Machine Learning", "Deep Learning", "TensorFlow", "PyTorch",
    "Pandas", "NumPy", "Scikit-learn", "Power BI", "Tableau",
    "Spark", "Hadoop", "ETL", "Data Science",
    # Mobile
    "Android", "iOS", "React Native", "Flutter", "Xamarin",
    # Metodologias / otros
    "Scrum", "Agile", "Kanban", "DevOps", "REST", "GraphQL",
    "Microservicios", "Microservices", "SOAP", "API REST",
    # Idiomas / soft
    "inglés avanzado", "inglés intermedio", "inglés técnico",
    "inglés B2", "inglés C1", "inglés",
]


def extract_skills(text: str) -> list[str]:
    """Busca skills en `text` por keyword matching con limites de palabra."""
    text_lower = text.lower()
    found = []
    for skill in SKILLS_CATALOG:
        pattern = r'\b' + re.escape(skill.lower()) + r'\b'
        if re.search(pattern, text_lower):
            found.append(skill)
    return list(set(found))


def rank_skills(skill_lists: list[list[str]], top_n: int = 20) -> list[dict]:
    """Cuenta frecuencia y devuelve los top_n skills como lista de dicts."""
    flat = [skill for sublist in skill_lists for skill in sublist]
    total = len(skill_lists) or 1
    return [
        {"skill": skill, "count": count, "pct": round(count / total * 100)}
        for skill, count in Counter(flat).most_common(top_n)
    ]
````

## File: scraper/models.py
````python
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
````

## File: scraper/requirements.txt
````
flask==3.0.3
pymongo==4.8.0
requests==2.34.2
beautifulsoup4==4.15.0
apscheduler==3.10.4
python-dotenv==1.0.1
````

## File: scraper/scraper.py
````python
import time
import random
import requests
from bs4 import BeautifulSoup
from extractor import extract_skills, rank_skills

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "es-MX,es;q=0.9,en;q=0.8",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Referer": "https://www.occ.com.mx/",
}

# Especialidad (la "capa de precisión") -> query de OCC mucho más específico.
# Las keys coinciden EXACTAMENTE con src/bot/especialidades.js (contrato compartido).
ESPECIALIDAD_MAP = {
    "desarrollo-web": "desarrollador-web",
    "datos-ia": "data-scientist",
    "ciberseguridad": "ingeniero-de-ciberseguridad",
    "devops-cloud": "ingeniero-devops",
    "redes": "administrador-de-redes",
}

# Datos reales del mercado tech mexicano (fuente: OCC/LinkedIn 2024-2025), uno
# por especialidad. Es lo que hace que el bot dé consejos específicos aunque OCC
# bloquee el scraper.
SEED_DATA = {
    "desarrollo-web": [
        {"skill": "JavaScript", "count": 88, "pct": 88},
        {"skill": "React",      "count": 76, "pct": 76},
        {"skill": "HTML/CSS",   "count": 72, "pct": 72},
        {"skill": "Node.js",    "count": 68, "pct": 68},
        {"skill": "Git",        "count": 65, "pct": 65},
        {"skill": "TypeScript", "count": 58, "pct": 58},
        {"skill": "SQL",        "count": 55, "pct": 55},
        {"skill": "MongoDB",    "count": 42, "pct": 42},
        {"skill": "Next.js",    "count": 40, "pct": 40},
        {"skill": "inglés",     "count": 70, "pct": 70},
    ],
    "datos-ia": [
        {"skill": "Python",           "count": 92, "pct": 92},
        {"skill": "SQL",              "count": 85, "pct": 85},
        {"skill": "Pandas",           "count": 72, "pct": 72},
        {"skill": "Machine Learning", "count": 70, "pct": 70},
        {"skill": "Power BI",         "count": 65, "pct": 65},
        {"skill": "NumPy",            "count": 60, "pct": 60},
        {"skill": "Scikit-learn",     "count": 52, "pct": 52},
        {"skill": "TensorFlow",       "count": 48, "pct": 48},
        {"skill": "Tableau",          "count": 45, "pct": 45},
        {"skill": "inglés",           "count": 80, "pct": 80},
    ],
    "ciberseguridad": [
        {"skill": "Linux",     "count": 88, "pct": 88},
        {"skill": "inglés",    "count": 85, "pct": 85},
        {"skill": "Bash",      "count": 78, "pct": 78},
        {"skill": "Python",    "count": 75, "pct": 75},
        {"skill": "Redes",     "count": 70, "pct": 70},
        {"skill": "AWS",       "count": 60, "pct": 60},
        {"skill": "Git",       "count": 55, "pct": 55},
        {"skill": "Docker",    "count": 52, "pct": 52},
        {"skill": "SQL",       "count": 50, "pct": 50},
        {"skill": "Wireshark", "count": 48, "pct": 48},
    ],
    "devops-cloud": [
        {"skill": "Docker",     "count": 85, "pct": 85},
        {"skill": "AWS",        "count": 78, "pct": 78},
        {"skill": "Linux",      "count": 75, "pct": 75},
        {"skill": "Git",        "count": 72, "pct": 72},
        {"skill": "Kubernetes", "count": 70, "pct": 70},
        {"skill": "Bash",       "count": 68, "pct": 68},
        {"skill": "CI/CD",      "count": 65, "pct": 65},
        {"skill": "Terraform",  "count": 58, "pct": 58},
        {"skill": "Python",     "count": 55, "pct": 55},
        {"skill": "Azure",      "count": 50, "pct": 50},
    ],
    "redes": [
        {"skill": "Redes",   "count": 85, "pct": 85},
        {"skill": "Cisco",   "count": 80, "pct": 80},
        {"skill": "Linux",   "count": 75, "pct": 75},
        {"skill": "inglés",  "count": 68, "pct": 68},
        {"skill": "Bash",    "count": 65, "pct": 65},
        {"skill": "AWS",     "count": 55, "pct": 55},
        {"skill": "VPN",     "count": 52, "pct": 52},
        {"skill": "Azure",   "count": 50, "pct": 50},
        {"skill": "Python",  "count": 48, "pct": 48},
        {"skill": "Docker",  "count": 45, "pct": 45},
    ],
}

# Fallback generico si la especialidad no tiene seed especifico
DEFAULT_SEED = SEED_DATA["desarrollo-web"]


def especialidad_to_occ_query(especialidad: str) -> str:
    """Mapea una especialidad (key kebab-case) a un query de OCC específico."""
    return ESPECIALIDAD_MAP.get((especialidad or "").lower().strip(), "desarrollador-web")


def scrape_occ(especialidad: str, max_pages: int = 3) -> dict:
    query = especialidad_to_occ_query(especialidad)
    all_skill_lists = []
    total_jobs = 0
    blocked = False

    print(f"  Buscando OCC: '{query}' ({max_pages} páginas)")

    session = requests.Session()
    # Visita el home primero para obtener cookies (reduce bloqueos)
    try:
        session.get("https://www.occ.com.mx/", headers=HEADERS, timeout=10)
        time.sleep(1.5)
    except Exception:
        pass

    for page in range(1, max_pages + 1):
        url = f"https://www.occ.com.mx/empleos/de-{query}/?page={page}"
        try:
            resp = session.get(url, headers=HEADERS, timeout=15)

            # OCC devuelve 403 o redirige a captcha cuando bloquea
            if resp.status_code in (403, 429):
                print(f"    ⚠️  OCC bloqueó la petición (HTTP {resp.status_code})")
                blocked = True
                break

            resp.raise_for_status()
            soup = BeautifulSoup(resp.text, "html.parser")

            # Detecta pagina de captcha/bloqueo
            page_text = soup.get_text(" ", strip=True).lower()
            if "captcha" in page_text or "acceso denegado" in page_text or len(page_text) < 200:
                print("    ⚠️  OCC devolvió captcha o página vacía")
                blocked = True
                break

            # Selectores en orden de especificidad para OCC
            blocks = (
                soup.select("article[data-testid]")           # OCC nuevo
                or soup.select("article")                      # generico
                or soup.select("[class*='VacancyCard']")       # componente React
                or soup.select("[class*='vacancy-card']")
                or soup.select("[class*='job-card']")
                or soup.select("li[class*='vacancy']")
                or soup.select("li[class*='job']")
            )

            # Fallback: extrae el body completo de la pagina
            if not blocks:
                blocks = [soup.body] if soup.body else []
                print(f"    ℹ️  Usando body completo como fallback")

            hits = 0
            for block in blocks:
                text = block.get_text(" ", strip=True)
                if len(text) < 40:
                    continue
                skills = extract_skills(text)
                if skills:
                    all_skill_lists.append(skills)
                    total_jobs += 1
                    hits += 1

            print(f"    Pág {page}: {hits} bloques con skills | total acumulado: {total_jobs}")

        except requests.HTTPError as e:
            print(f"    HTTP {e.response.status_code} en pág {page}")
            if e.response.status_code in (403, 429):
                blocked = True
                break
        except Exception as e:
            print(f"    Error pág {page}: {e}")

        time.sleep(random.uniform(2, 4))

    # Si OCC bloqueó o no extrajo nada, usa datos del mercado pre-cargados
    if blocked or not all_skill_lists:
        seed = SEED_DATA.get((especialidad or "").lower().strip(), DEFAULT_SEED)
        print(f"  [SCRAPE] Usando datos pre-cargados para '{especialidad}' ({len(seed)} skills)")
        return {
            "skills": seed,
            "total_jobs": 100,  # estimado basado en OCC 2024-2025
            "query": query,
            "source": "seed",
        }

    return {
        "skills": rank_skills(all_skill_lists),
        "total_jobs": total_jobs,
        "query": query,
        "source": "live",
    }
````

## File: src/bot/cv_generator.js
````javascript
import PDFDocument from 'pdfkit';
import { config } from '../config.js';
import { logger } from '../logger.js';
import { STATES } from './states.js';
import { ESPECIALIDADES, NIVELES, labelDe } from './especialidades.js';

/**
 * Generador de CV estilo Harvard.
 *
 * Responsabilidad separada de cv_matcher.js: el matcher COMPARA skills contra el
 * mercado; este arma el DOCUMENTO. El comando /cv corre un mini-flujo de 4
 * preguntas (estados CV_*) y al final estructura el contenido con Groq y lo
 * renderiza a PDF con PDFKit (Times-Roman, una columna, estilo Harvard).
 */

// ---------------------------------------------------------------------------
// Mini-flujo de preguntas (estados CV_*). El último paso marca generateCV.
// ---------------------------------------------------------------------------

const SKIP = new Set(['0', '-', 'no', 'ninguno', 'ninguna', 'saltar', 'skip']);

function splitLineas(text) {
  return text
    .split(/[\n;]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export const cvSteps = {
  [STATES.CV_ASK_PROYECTOS]: {
    prompt: () =>
      '📄 Vamos a armar tu CV estilo Harvard.\n\n' +
      '*1/4* — ¿Qué proyectos o experiencia tienes? (aunque sean pequeños)\n' +
      'Uno por línea o separados por *;*. Escribe *0* para saltar.\n\n' +
      'Ej: App de tareas en React; Servicio social en sistemas de la escuela',
    handle: (text, profile) => {
      const limpio = text.trim().toLowerCase();
      profile.proyectos = SKIP.has(limpio) ? [] : splitLineas(text);
      return { ok: true, next: STATES.CV_ASK_LOGROS };
    },
  },

  [STATES.CV_ASK_LOGROS]: {
    prompt: () =>
      '*2/4* — ¿Tienes logros o reconocimientos? (becas, concursos, certificados)\n' +
      'Uno por línea o separados por *;*. Escribe *0* para saltar.',
    handle: (text, profile) => {
      const limpio = text.trim().toLowerCase();
      profile.logros = SKIP.has(limpio) ? [] : splitLineas(text);
      return { ok: true, next: STATES.CV_ASK_LINKS };
    },
  },

  [STATES.CV_ASK_LINKS]: {
    prompt: () =>
      '*3/4* — ¿Tienes GitHub o LinkedIn? Pega los links (o *0* para saltar).\n\n' +
      'Ej: github.com/tuusuario, linkedin.com/in/tuusuario',
    handle: (text, profile) => {
      const limpio = text.trim().toLowerCase();
      if (!SKIP.has(limpio)) {
        const { github, linkedin } = parseLinks(text);
        if (github) profile.github = github;
        if (linkedin) profile.linkedin = linkedin;
      }
      return { ok: true, next: STATES.CV_ASK_EMAIL };
    },
  },

  [STATES.CV_ASK_EMAIL]: {
    prompt: () =>
      '*4/4* — ¿Cuál es tu email de contacto? (o *0* para saltar)',
    handle: (text, profile) => {
      const limpio = text.trim();
      if (SKIP.has(limpio.toLowerCase())) {
        return { ok: true, generateCV: true };
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(limpio)) {
        return { ok: false, error: 'Ese email no se ve válido. Escríbelo bien o *0* para saltar 📧' };
      }
      profile.email = limpio;
      return { ok: true, generateCV: true };
    },
  },
};

/**
 * Extrae URLs de GitHub y LinkedIn de texto libre.
 */
function parseLinks(text) {
  const result = {};
  for (const token of text.split(/[\s,]+/)) {
    const t = token.trim().replace(/^https?:\/\//, '');
    if (/github\.com/i.test(t)) result.github = t;
    else if (/linkedin\.com/i.test(t)) result.linkedin = t;
  }
  return result;
}

// ---------------------------------------------------------------------------
// Estructuración del contenido (Groq + fallback determinista)
// ---------------------------------------------------------------------------

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

// Categorización de skills para el fallback (cuando Groq no responde)
const CATEGORIAS = {
  Lenguajes: ['javascript', 'typescript', 'python', 'java', 'c#', 'c++', 'php', 'go', 'ruby', 'kotlin', 'swift', 'rust', 'bash', 'r'],
  Frameworks: ['react', 'angular', 'vue', 'next.js', 'node.js', 'express', 'django', 'flask', 'fastapi', 'spring boot', 'laravel', '.net', 'nestjs', 'tensorflow', 'pytorch', 'pandas', 'numpy', 'scikit-learn'],
  'Bases de datos': ['sql', 'mysql', 'postgresql', 'mongodb', 'redis', 'oracle', 'sql server'],
  'Cloud y herramientas': ['aws', 'azure', 'gcp', 'docker', 'kubernetes', 'git', 'github', 'terraform', 'ci/cd', 'jenkins', 'linux', 'power bi', 'tableau', 'cisco', 'wireshark'],
};

/**
 * Categoriza skills con el mapa local (fallback sin IA).
 */
function categorizarLocal(habilidades) {
  const cats = { Lenguajes: [], Frameworks: [], 'Bases de datos': [], 'Cloud y herramientas': [], Otras: [] };
  for (const skill of habilidades) {
    const lower = skill.toLowerCase();
    if (/ingl|franc|alem|portug|español/.test(lower)) continue; // idiomas van aparte
    let ubicada = false;
    for (const [cat, lista] of Object.entries(CATEGORIAS)) {
      if (lista.includes(lower)) {
        cats[cat].push(skill);
        ubicada = true;
        break;
      }
    }
    if (!ubicada) cats.Otras.push(skill);
  }
  // Quita categorías vacías
  return Object.fromEntries(Object.entries(cats).filter(([, v]) => v.length));
}

/**
 * Estructura los datos del perfil en secciones de CV. Intenta con Groq (resumen
 * profesional + categorización + pulido de proyectos); si falla, usa un armado
 * determinista para que /cv NUNCA quede sin entregar.
 */
export async function structureCV(profile) {
  const especialidad = profile.especialidad
    ? labelDe(profile.especialidad, ESPECIALIDADES)
    : 'desarrollo de software';
  const nivel = profile.nivel ? labelDe(profile.nivel, NIVELES) : 'estudiante';

  const fallback = () => ({
    resumen:
      `Estudiante de ${profile.carrera} enfocado en ${especialidad}. ` +
      `Busca aplicar y seguir desarrollando habilidades en ${profile.habilidades.slice(0, 3).join(', ')}.`,
    habilidades: categorizarLocal(profile.habilidades),
    proyectos: (profile.proyectos || []).map((p) => ({ titulo: p, descripcion: '' })),
  });

  if (!config.groqKey) return fallback();

  const prompt = `Eres un experto en CVs estilo Harvard para estudiantes de tecnología en México.
Devuelve SOLO un objeto JSON válido (sin texto antes ni después) con esta forma exacta:
{
  "resumen": "2 oraciones en español, perfil profesional enfocado en ${especialidad}, nivel ${nivel}",
  "habilidades": { "Lenguajes": [], "Frameworks": [], "Bases de datos": [], "Cloud y herramientas": [], "Otras": [] },
  "proyectos": [ { "titulo": "...", "descripcion": "1 oración con verbos de acción y resultado" } ]
}

Datos del estudiante:
- Carrera: ${profile.carrera}, semestre ${profile.semestre}
- Especialidad: ${especialidad}
- Habilidades: ${profile.habilidades.join(', ')}
- Proyectos/experiencia (texto crudo): ${(profile.proyectos || []).join(' | ') || 'ninguno'}

Reglas: categoriza cada habilidad en su grupo (omite grupos vacíos). Para proyectos, pule el texto crudo a título + descripción profesional. Si no hay proyectos, devuelve [].`;

  try {
    const res = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.groqKey}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.5,
        max_tokens: 1200,
        response_format: { type: 'json_object' },
      }),
    });
    if (!res.ok) throw new Error(`Groq ${res.status}`);
    const data = await res.json();
    const raw = data.choices?.[0]?.message?.content ?? '';
    const parsed = JSON.parse(raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1));

    // Valida forma mínima; si algo falta, completa con el fallback
    const fb = fallback();
    return {
      resumen: typeof parsed.resumen === 'string' && parsed.resumen ? parsed.resumen : fb.resumen,
      habilidades:
        parsed.habilidades && typeof parsed.habilidades === 'object'
          ? Object.fromEntries(
              Object.entries(parsed.habilidades).filter(([, v]) => Array.isArray(v) && v.length)
            )
          : fb.habilidades,
      proyectos: Array.isArray(parsed.proyectos) ? parsed.proyectos : fb.proyectos,
    };
  } catch (err) {
    logger.warn({ err: err.message, telegramId: profile.telegramId }, 'structureCV cayó a fallback');
    return fallback();
  }
}

// ---------------------------------------------------------------------------
// Renderizado PDF (estilo Harvard)
// ---------------------------------------------------------------------------

function idiomasDe(habilidades) {
  const idiomas = ['Español: Nativo'];
  for (const h of habilidades) {
    if (/ingl[eé]s|franc[eé]s|alem[aá]n|portugu[eé]s/i.test(h)) {
      idiomas.push(h.charAt(0).toUpperCase() + h.slice(1));
    }
  }
  return idiomas;
}

function seccion(doc, titulo) {
  doc.moveDown(0.6);
  doc.font('Times-Bold').fontSize(11.5).fillColor('#000').text(titulo.toUpperCase());
  const y = doc.y + 1.5;
  doc
    .moveTo(doc.page.margins.left, y)
    .lineTo(doc.page.width - doc.page.margins.right, y)
    .lineWidth(0.7)
    .stroke();
  doc.moveDown(0.35);
}

/**
 * Construye el PDF y lo devuelve como Buffer.
 * @returns {Promise<Buffer>}
 */
export function buildPDF(profile, structured) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'LETTER',
      margins: { top: 50, bottom: 50, left: 60, right: 60 },
    });
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // --- Encabezado: nombre centrado + contacto ---
    doc.font('Times-Bold').fontSize(20).text(profile.nombre.toUpperCase(), { align: 'center' });
    const contacto = [profile.email, profile.github, profile.linkedin].filter(Boolean).join('   |   ');
    if (contacto) {
      doc.font('Times-Roman').fontSize(10).text(contacto, { align: 'center' });
    }
    const yLine = doc.y + 3;
    doc
      .moveTo(doc.page.margins.left, yLine)
      .lineTo(doc.page.width - doc.page.margins.right, yLine)
      .lineWidth(1.2)
      .stroke();
    doc.moveDown(0.5);

    // --- Perfil ---
    if (structured.resumen) {
      seccion(doc, 'Perfil Profesional');
      doc.font('Times-Roman').fontSize(10.5).text(structured.resumen, { align: 'justify' });
    }

    // --- Educación (primero: es lo más fuerte de un estudiante) ---
    seccion(doc, 'Educación');
    doc.font('Times-Bold').fontSize(11).text(profile.carrera);
    let sub = `Semestre ${profile.semestre}`;
    if (profile.promedio >= 8) sub += `   ·   Promedio: ${profile.promedio}`;
    doc.font('Times-Roman').fontSize(10).text(sub);

    // --- Habilidades técnicas (categorizadas) ---
    const cats = structured.habilidades || {};
    if (Object.keys(cats).length) {
      seccion(doc, 'Habilidades Técnicas');
      for (const [cat, items] of Object.entries(cats)) {
        doc.font('Times-Bold').fontSize(10).text(`${cat}: `, { continued: true });
        doc.font('Times-Roman').text(items.join(', '));
      }
    }

    // --- Proyectos ---
    if (structured.proyectos?.length) {
      seccion(doc, 'Proyectos y Experiencia');
      for (const p of structured.proyectos) {
        doc.font('Times-Bold').fontSize(10.5).text(p.titulo || p);
        if (p.descripcion) {
          doc.font('Times-Roman').fontSize(10).text(p.descripcion, { indent: 12 });
        }
        doc.moveDown(0.2);
      }
    }

    // --- Logros ---
    if (profile.logros?.length) {
      seccion(doc, 'Logros y Reconocimientos');
      for (const l of profile.logros) {
        doc.font('Times-Roman').fontSize(10).text(`•  ${l}`);
      }
    }

    // --- Idiomas ---
    seccion(doc, 'Idiomas');
    doc.font('Times-Roman').fontSize(10).text(idiomasDe(profile.habilidades).join('   ·   '));

    doc.end();
  });
}

/**
 * Orquesta todo: estructura el contenido y construye el PDF.
 * @returns {Promise<{buffer: Buffer, filename: string}>}
 */
export async function generarCV(profile) {
  const structured = await structureCV(profile);
  const buffer = await buildPDF(profile, structured);
  const slug = (profile.nombre || 'CV').replace(/\s+/g, '_');
  return { buffer, filename: `CV_${slug}.pdf` };
}
````

## File: src/bot/cv_matcher.js
````javascript
/**
 * Aliases para normalizar lo que el usuario escribe en el onboarding
 * contra los nombres canonicos del mercado.
 * Ej: "js" -> "JavaScript", "node" -> "Node.js", "ingles" -> "inglés"
 */
const ALIASES = {
  js: 'JavaScript', javascript: 'JavaScript',
  ts: 'TypeScript', typescript: 'TypeScript',
  'node': 'Node.js', nodejs: 'Node.js', 'node.js': 'Node.js',
  reactjs: 'React', 'react.js': 'React',
  vuejs: 'Vue', 'vue.js': 'Vue',
  angularjs: 'Angular', 'angular.js': 'Angular',
  py: 'Python',
  postgres: 'PostgreSQL', postgresql: 'PostgreSQL',
  mongo: 'MongoDB',
  k8s: 'Kubernetes',
  csharp: 'C#',
  cpp: 'C++',
  golang: 'Go',
  dotnet: '.NET', '.net': '.NET',
  spring: 'Spring Boot', 'spring boot': 'Spring Boot',
  nestjs: 'NestJS',
  ml: 'Machine Learning',
  dl: 'Deep Learning',
  powerbi: 'Power BI', 'power bi': 'Power BI',
  ingles: 'inglés', english: 'inglés',
  'inglés avanzado': 'inglés', 'inglés b2': 'inglés', 'inglés c1': 'inglés',
  'inglés intermedio': 'inglés', 'inglés técnico': 'inglés',
};

function normalize(skill) {
  const lower = skill.toLowerCase().trim();
  return (ALIASES[lower] || skill.trim()).toLowerCase();
}

/**
 * Compara las habilidades del usuario contra el top de skills del mercado.
 * Devuelve { score, have, missing }.
 *
 * @param {string[]} userSkills  - profile.habilidades
 * @param {Array<{skill:string}>} marketSkills - top skills del endpoint /skills
 */
export function matchSkills(userSkills, marketSkills) {
  const userSet = new Set(userSkills.map(normalize));

  const have = [];
  const missing = [];

  for (const { skill } of marketSkills) {
    if (userSet.has(normalize(skill))) {
      have.push(skill);
    } else {
      missing.push(skill);
    }
  }

  const score = Math.round((have.length / marketSkills.length) * 100);
  return { score, have, missing };
}

/**
 * Registra un score en el historial del perfil, con UNA entrada por mes y
 * especialidad. Guarda contra qué especialidad se midió, para que /progreso no
 * compare peras (datos) con manzanas (ciberseguridad) si cambiaste de rumbo.
 *
 * Si ya hay una medición de este mes-año Y misma especialidad, la actualiza
 * (refleja mejoras al volver a correr /miCV el mismo mes); si no, agrega una
 * nueva. Mantiene un máximo de 12 entradas. Muta `profile.cvScores`.
 *
 * @param {{cvScores: Array<{score:number, fecha:Date, especialidad:string}>}} profile
 * @param {number} score
 * @param {string} especialidad
 */
export function recordScore(profile, score, especialidad) {
  const ahora = new Date();
  const mismaEntrada = profile.cvScores.find((s) => {
    const d = new Date(s.fecha);
    return (
      d.getMonth() === ahora.getMonth() &&
      d.getFullYear() === ahora.getFullYear() &&
      s.especialidad === especialidad
    );
  });

  if (mismaEntrada) {
    mismaEntrada.score = score;
    mismaEntrada.fecha = ahora;
  } else {
    profile.cvScores.push({ score, fecha: ahora, especialidad });
    if (profile.cvScores.length > 12) profile.cvScores.shift();
  }
}

/**
 * Genera el mensaje de diagnostico para Telegram (formato Markdown).
 */
export function formatCVReport(carrera, score, have, missing) {
  const emoji =
    score >= 80 ? '🔥' : score >= 60 ? '💪' : score >= 40 ? '📈' : '🌱';

  const haveText =
    have.length > 0
      ? have.map((s) => `✅ ${s}`).join('\n')
      : '  _(ninguna del top de mercado aún)_';

  const missingText =
    missing.length > 0
      ? missing.map((s) => `❌ ${s}`).join('\n')
      : '  ¡Ya tienes todo! 🏆';

  return (
    `${emoji} *Diagnóstico de tu CV*\n\n` +
    `Carrera: *${carrera}*\n` +
    `Compatibilidad con el mercado: *${score}%*\n\n` +
    `*Ya tienes:*\n${haveText}\n\n` +
    `*Te falta para llegar al 100%:*\n${missingText}\n\n` +
    `Usa /plan para generar tu plan de estudios personalizado 📅`
  );
}
````

## File: src/bot/especialidades.js
````javascript
/**
 * Taxonomía de especialidades — la "capa de precisión" entre la carrera y todo
 * lo demás. El bot deja de tratar "Ingeniería en Sistemas" como una sola cosa y
 * dirige cada función (mercado, CV, plan, becas) según hacia dónde va el estudiante.
 *
 * IMPORTANTE: las `key` (kebab-case) son el contrato compartido con el scraper
 * Python (ESPECIALIDAD_MAP y SEED_DATA en scraper.py). No cambiar sin actualizar
 * ambos lados.
 */
export const ESPECIALIDADES = [
  { key: 'desarrollo-web', label: 'Desarrollo Web/Mobile', emoji: '🌐' },
  { key: 'datos-ia', label: 'Datos e Inteligencia Artificial', emoji: '📊' },
  { key: 'ciberseguridad', label: 'Ciberseguridad', emoji: '🔐' },
  { key: 'devops-cloud', label: 'DevOps y Cloud', emoji: '☁️' },
  { key: 'redes', label: 'Redes e Infraestructura', emoji: '🖧' },
];

// Especialidad por defecto cuando el estudiante elige "aún no lo sé"
export const ESPECIALIDAD_DEFAULT = 'desarrollo-web';

export const OBJETIVOS = [
  { key: 'startup', label: 'Startup / empresa tech' },
  { key: 'corporativo', label: 'Corporativo / banco' },
  { key: 'gobierno', label: 'Gobierno / sector público' },
  { key: 'freelance', label: 'Freelance / remoto' },
  { key: 'emprendimiento', label: 'Mi propio emprendimiento' },
];

export const NIVELES = [
  { key: 'principiante', label: 'Principiante (apenas empiezo)' },
  { key: 'intermedio', label: 'Intermedio (ya hice proyectos)' },
  { key: 'avanzado', label: 'Avanzado (me siento sólido)' },
];

/**
 * Plataformas/recursos recomendados por especialidad. Se inyectan en el prompt
 * de Groq para que el plan sea relevante (ciberseguridad → TryHackMe, no freeCodeCamp).
 */
export const PLATAFORMAS = {
  'desarrollo-web': 'freeCodeCamp, The Odin Project, MDN Web Docs, Frontend Mentor',
  'datos-ia': 'Kaggle, fast.ai, Google Data Analytics (Coursera), DataCamp gratis',
  'ciberseguridad': 'TryHackMe, HackTheBox, OverTheWire, PortSwigger Web Security Academy',
  'devops-cloud': 'KodeKloud, AWS Skill Builder, Docker docs, freeCodeCamp DevOps',
  'redes': 'Cisco Networking Academy, Packet Tracer, Professor Messer, Linux Journey',
};

/**
 * Renderiza un menú numerado de opciones para enviar por Telegram.
 * @param {Array<{label:string, emoji?:string}>} opciones
 */
export function renderMenu(opciones) {
  return opciones
    .map((o, i) => `${i + 1}. ${o.emoji ? o.emoji + ' ' : ''}${o.label}`)
    .join('\n');
}

/**
 * Interpreta la respuesta del usuario (número o texto) contra una lista de
 * opciones. Devuelve la `key` elegida o null si no coincide.
 *
 * @param {string} text
 * @param {Array<{key:string, label:string}>} opciones
 */
export function parseSeleccion(text, opciones) {
  const limpio = text.trim().toLowerCase();

  // Por número (1-based)
  const num = Number(limpio);
  if (Number.isInteger(num) && num >= 1 && num <= opciones.length) {
    return opciones[num - 1].key;
  }

  // Por coincidencia de texto contra key o label
  const match = opciones.find(
    (o) => o.key === limpio || o.label.toLowerCase().includes(limpio)
  );
  return match ? match.key : null;
}

/**
 * Etiqueta legible de una key (para mostrar en el perfil).
 */
export function labelDe(key, opciones) {
  const o = opciones.find((x) => x.key === key);
  return o ? `${o.emoji ? o.emoji + ' ' : ''}${o.label}` : key;
}
````

## File: src/bot/onboarding.js
````javascript
import { STATES } from './states.js';
import {
  ESPECIALIDADES,
  ESPECIALIDAD_DEFAULT,
  OBJETIVOS,
  NIVELES,
  renderMenu,
  parseSeleccion,
  labelDe,
} from './especialidades.js';

/**
 * Define cada paso del onboarding como una transicion de la maquina de estados:
 *
 *   prompt(profile)        -> texto que el bot envia al ENTRAR a este estado
 *   handle(text, profile)  -> procesa la respuesta del usuario.
 *                             Devuelve { ok, error?, next } donde:
 *                               - ok:    true si la respuesta fue valida
 *                               - error: mensaje a mostrar si ok=false (se re-pregunta)
 *                               - next:  estado siguiente si ok=true
 *                             Muta `profile` con el dato capturado.
 *
 * Para agregar un paso nuevo basta con anadir una entrada aqui y el estado en states.js.
 */
export const steps = {
  [STATES.ASK_NOMBRE]: {
    prompt: () => '👋 ¡Hola! Soy tu asistente de carrera. Para empezar, ¿cómo te llamas?',
    handle: (text, profile) => {
      const nombre = text.trim();
      if (nombre.length < 2) {
        return { ok: false, error: 'Escribe un nombre válido por favor 🙂' };
      }
      profile.nombre = nombre;
      return { ok: true, next: STATES.ASK_CARRERA };
    },
  },

  [STATES.ASK_CARRERA]: {
    prompt: (profile) => `Mucho gusto, ${profile.nombre}. ¿Qué carrera estudias?`,
    handle: (text, profile) => {
      const carrera = text.trim();
      if (carrera.length < 2) {
        return { ok: false, error: 'Dime el nombre de tu carrera 📚' };
      }
      profile.carrera = carrera;
      return { ok: true, next: STATES.ASK_ESPECIALIDAD };
    },
  },

  [STATES.ASK_ESPECIALIDAD]: {
    prompt: () =>
      '¿En qué te quieres especializar? Responde con el número:\n\n' +
      renderMenu(ESPECIALIDADES) +
      `\n${ESPECIALIDADES.length + 1}. 🤔 Aún no lo sé`,
    handle: (text, profile) => handleEspecialidad(text, profile, STATES.ASK_OBJETIVO),
  },

  [STATES.ASK_OBJETIVO]: {
    prompt: () =>
      '¿Dónde te gustaría trabajar? (opcional — escribe *0* para saltar)\n\n' +
      renderMenu(OBJETIVOS),
    handle: (text, profile) => {
      const limpio = text.trim().toLowerCase();
      if (limpio === '0' || limpio === 'saltar' || limpio === 'no se' || limpio === 'no sé') {
        profile.objetivo = undefined;
        return { ok: true, next: STATES.ASK_SEMESTRE };
      }
      const key = parseSeleccion(text, OBJETIVOS);
      if (!key) {
        return { ok: false, error: 'Elige un número del 1 al 5, o 0 para saltar 🙂' };
      }
      profile.objetivo = key;
      return { ok: true, next: STATES.ASK_SEMESTRE };
    },
  },

  [STATES.ASK_SEMESTRE]: {
    prompt: () => '¿En qué semestre vas? (un número del 1 al 14)',
    handle: (text, profile) => {
      const semestre = Number(text.trim());
      if (!Number.isInteger(semestre) || semestre < 1 || semestre > 14) {
        return { ok: false, error: 'Escribe solo un número entre 1 y 14 🔢' };
      }
      profile.semestre = semestre;
      return { ok: true, next: STATES.ASK_PROMEDIO };
    },
  },

  [STATES.ASK_PROMEDIO]: {
    prompt: () => '¿Cuál es tu promedio actual? (escala 0 a 10, ej. 8.5)',
    handle: (text, profile) => {
      const promedio = Number(text.trim().replace(',', '.'));
      if (Number.isNaN(promedio) || promedio < 0 || promedio > 10) {
        return { ok: false, error: 'Dame un promedio entre 0 y 10 (ej. 8.5) 📊' };
      }
      profile.promedio = promedio;
      return { ok: true, next: STATES.ASK_HABILIDADES };
    },
  },

  [STATES.ASK_HABILIDADES]: {
    prompt: () =>
      '¿Qué habilidades técnicas ya tienes? Sepáralas con comas.\n' +
      'Ej: Python, SQL, Git, inglés B1',
    handle: (text, profile) => handleHabilidades(text, profile, STATES.ASK_NIVEL),
  },

  [STATES.ASK_NIVEL]: {
    prompt: () =>
      '¿Cómo describes tu nivel técnico actual? Responde con el número:\n\n' +
      renderMenu(NIVELES),
    handle: (text, profile) => handleNivel(text, profile, STATES.ASK_HORARIO),
  },

  [STATES.ASK_HORARIO]: {
    prompt: () =>
      '¡Casi listo! ¿Qué días y horas tienes libres para estudiar?\n' +
      'Formato: día hora-hora, uno por línea o separado por comas.\n' +
      'Ej: lunes 19:00-21:00, miércoles 19:00-21:00, sábado 09:00-13:00',
    handle: (text, profile) => handleHorario(text, profile, STATES.DONE),
  },

  // --- Edicion puntual: reutilizan la misma logica pero vuelven a DONE ---
  [STATES.EDIT_HABILIDADES]: {
    prompt: () =>
      'Actualiza tus habilidades (sepáralas con comas).\n' +
      'Ej: Python, SQL, React, Docker, inglés B2',
    handle: (text, profile) => handleHabilidades(text, profile, STATES.DONE),
  },

  [STATES.EDIT_HORARIO]: {
    prompt: () =>
      'Actualiza tu disponibilidad para estudiar.\n' +
      'Ej: lunes 19:00-21:00, miércoles 19:00-21:00, sábado 09:00-13:00',
    handle: (text, profile) => handleHorario(text, profile, STATES.DONE),
  },

  [STATES.EDIT_ESPECIALIDAD]: {
    prompt: () =>
      'Elige tu especialidad. Responde con el número:\n\n' +
      renderMenu(ESPECIALIDADES) +
      `\n${ESPECIALIDADES.length + 1}. 🤔 Aún no lo sé`,
    handle: (text, profile) => handleEspecialidad(text, profile, STATES.DONE),
  },
};

/**
 * Parsea la especialidad elegida (número o texto). La opción "aún no lo sé"
 * (último número) cae al default razonable. Compartido por onboarding y edición.
 */
function handleEspecialidad(text, profile, next) {
  const limpio = text.trim().toLowerCase();

  // "Aún no lo sé" = la opción extra después de la lista
  if (limpio === String(ESPECIALIDADES.length + 1) || limpio.includes('no lo s')) {
    profile.especialidad = ESPECIALIDAD_DEFAULT;
    return { ok: true, next };
  }

  const key = parseSeleccion(text, ESPECIALIDADES);
  if (!key) {
    return {
      ok: false,
      error: `Elige un número del 1 al ${ESPECIALIDADES.length + 1} 🙂`,
    };
  }
  profile.especialidad = key;
  return { ok: true, next };
}

/**
 * Parsea el nivel autopercibido (número o texto).
 */
function handleNivel(text, profile, next) {
  const key = parseSeleccion(text, NIVELES);
  if (!key) {
    return { ok: false, error: 'Elige 1 (principiante), 2 (intermedio) o 3 (avanzado) 🙂' };
  }
  profile.nivel = key;
  return { ok: true, next };
}

/**
 * Parsea y valida habilidades, las guarda en el perfil y transiciona a `next`.
 * Compartido por el onboarding (ASK_*) y la edición puntual (EDIT_*).
 */
function handleHabilidades(text, profile, next) {
  const habilidades = text
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (habilidades.length === 0) {
    return { ok: false, error: 'Escribe al menos una habilidad 🛠️' };
  }
  profile.habilidades = habilidades;
  return { ok: true, next };
}

/**
 * Parsea y valida el horario, lo guarda en el perfil y transiciona a `next`.
 */
function handleHorario(text, profile, next) {
  const horario = parseHorario(text);
  if (Object.keys(horario).length === 0) {
    return {
      ok: false,
      error: 'No entendí el horario. Usa: lunes 19:00-21:00, sábado 09:00-13:00 🗓️',
    };
  }
  profile.horario = horario;
  return { ok: true, next };
}

const DIAS = ['lunes', 'martes', 'miércoles', 'miercoles', 'jueves', 'viernes', 'sábado', 'sabado', 'domingo'];

/**
 * Convierte texto libre en un mapa { dia: "HH:MM-HH:MM" }.
 * Tolera acentos y separacion por comas o saltos de linea.
 */
function parseHorario(text) {
  const horario = {};
  const partes = text.toLowerCase().split(/[\n,]+/);
  for (const parte of partes) {
    const dia = DIAS.find((d) => parte.includes(d));
    const rango = parte.match(/(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/);
    if (dia && rango) {
      // Normaliza el dia sin acento como clave
      const clave = dia.replace('miércoles', 'miercoles').replace('sábado', 'sabado');
      horario[clave] = `${rango[1]}-${rango[2]}`;
    }
  }
  return horario;
}

/**
 * Resumen legible del perfil, se muestra al terminar el onboarding.
 */
export function resumenPerfil(profile) {
  const horario = Object.entries(Object.fromEntries(profile.horario))
    .map(([dia, rango]) => `   • ${dia}: ${rango}`)
    .join('\n');

  const especialidad = profile.especialidad
    ? labelDe(profile.especialidad, ESPECIALIDADES)
    : '—';
  const objetivo = profile.objetivo ? labelDe(profile.objetivo, OBJETIVOS) : '—';
  const nivel = profile.nivel ? labelDe(profile.nivel, NIVELES) : '—';

  return (
    `✅ ¡Perfil completo, ${profile.nombre}!\n\n` +
    `🎓 Carrera: ${profile.carrera}\n` +
    `🎯 Especialidad: ${especialidad}\n` +
    `🏢 Objetivo: ${objetivo}\n` +
    `📅 Semestre: ${profile.semestre}\n` +
    `📊 Promedio: ${profile.promedio}\n` +
    `🛠️ Habilidades: ${profile.habilidades.join(', ')}\n` +
    `📈 Nivel: ${nivel}\n` +
    `🗓️ Disponibilidad:\n${horario}\n\n` +
    `Ya te conozco 😎. Ahora mis consejos van dirigidos a *${especialidad}*.`
  );
}
````

## File: src/bot/planner.js
````javascript
import { config } from '../config.js';
import {
  ESPECIALIDADES,
  NIVELES,
  OBJETIVOS,
  PLATAFORMAS,
  labelDe,
} from './especialidades.js';

function formatHorario(horario) {
  return [...horario.entries()]
    .map(([dia, rango]) => {
      const [inicio, fin] = rango.split('-');
      return `${dia} de ${inicio} a ${fin}`;
    })
    .join(', ');
}

// Groq: inferencia LLM en la nube (rápida y gratuita), API compatible con OpenAI
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

export async function generatePlan(profile, missing) {
  const horarioTexto = formatHorario(profile.horario);
  const skillsTexto = missing.slice(0, 5).join(', ');

  // Contexto de especialidad: dirige los recursos que recomienda Groq
  const especialidadLabel = profile.especialidad
    ? labelDe(profile.especialidad, ESPECIALIDADES)
    : 'desarrollo de software general';
  const plataformas =
    PLATAFORMAS[profile.especialidad] ||
    'freeCodeCamp, The Odin Project, CS50, YouTube, docs oficiales';
  const nivelLabel = profile.nivel ? labelDe(profile.nivel, NIVELES) : 'no especificado';
  const objetivoLabel = profile.objetivo ? labelDe(profile.objetivo, OBJETIVOS) : 'no especificado';

  const prompt = `Eres un coach de carreras tech para el mercado mexicano, experto en ${especialidadLabel}.

Estudiante:
- Nombre: ${profile.nombre}
- Carrera: ${profile.carrera}, semestre ${profile.semestre}
- Especialidad objetivo: ${especialidadLabel}
- Nivel actual: ${nivelLabel}
- Dónde quiere trabajar: ${objetivoLabel}
- Habilidades actuales: ${profile.habilidades.join(', ')}
- Necesita aprender: ${skillsTexto}
- Disponibilidad: ${horarioTexto}

Genera un plan de estudios de 8 semanas ESPECÍFICO para ${especialidadLabel}, con recursos GRATUITOS y reales de esa área (prioriza: ${plataformas}).
Ajusta la dificultad al nivel ${nivelLabel}. No recomiendes recursos genéricos si hay uno mejor para la especialidad.

Formato EXACTO (sin introducción, empieza directo):

PLAN DE 8 SEMANAS — ${profile.nombre}

SEMANA 1: [skill]
Objetivo: [qué sabrá hacer]
Recurso: [recurso gratuito específico]
Horas: [horas según su disponibilidad]

SEMANA 2: [skill]
Objetivo: [...]
Recurso: [...]
Horas: [...]

[continúa hasta semana 8]

CONSEJO FINAL: [1-2 oraciones motivadoras]`;

  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.groqKey}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 1500,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Groq error: ${err}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? 'No se pudo generar el plan.';
}
````

## File: src/bot/progreso.js
````javascript
const MESES = ['Ene','Feb','Mar','Abr','May','Jun',
               'Jul','Ago','Sep','Oct','Nov','Dic'];

/**
 * Genera una grafica ASCII del historial de scores CV vs mercado.
 * Compatible con Telegram (usa bloque de codigo para alineacion).
 *
 * Filtra por la especialidad actual: los scores de otra especialidad no son
 * comparables (mercados distintos), así que no se mezclan en la misma gráfica.
 *
 * @param {Array<{score:number, fecha:Date, especialidad?:string}>} cvScores
 * @param {string} [especialidad] - si se da, solo muestra scores de esa especialidad
 */
export function generarGraficaProgreso(cvScores, especialidad) {
  // Solo el historial de la especialidad actual (los viejos sin especialidad
  // se incluyen como compatibilidad hacia atrás cuando no hay filtro claro)
  const relevantes = especialidad
    ? (cvScores || []).filter((s) => !s.especialidad || s.especialidad === especialidad)
    : cvScores || [];

  if (!relevantes.length) {
    return (
      'Aún no tienes historial de progreso para esta especialidad.\n' +
      'Usa /miCV para hacer tu primer diagnóstico.'
    );
  }

  const ultimos = relevantes.slice(-6);

  const lineas = ultimos.map(({ score, fecha }) => {
    const d = new Date(fecha);
    const etiqueta = `${MESES[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`;
    const bloques = Math.round(score / 10);
    const barra = '█'.repeat(bloques) + '░'.repeat(10 - bloques);
    return `${etiqueta.padEnd(7)} ${String(score + '%').padEnd(5)} ${barra}`;
  });

  const ultimo = ultimos.at(-1).score;
  const primero = ultimos[0].score;
  const diff = ultimo - primero;
  const tendencia = diff > 0 ? `+${diff}%` : `${diff}%`;
  const emoji = diff > 0 ? '🚀' : diff === 0 ? '➡️' : '📉';

  return (
    '📈 *Tu progreso de compatibilidad con el mercado*\n\n' +
    '```\n' +
    'Mes     Score  Gráfica\n' +
    '──────────────────────\n' +
    lineas.join('\n') +
    '\n```\n\n' +
    `${emoji} Evolución: *${tendencia}* en ${ultimos.length} medición(es)\n` +
    `Score actual: *${ultimo}%*\n\n` +
    'Usa /miCV para actualizar · /plan para seguir estudiando'
  );
}
````

## File: src/bot/scheduler.js
````javascript
import cron from 'node-cron';
import { Markup } from 'telegraf';
import { Profile } from '../models/profile.js';
import { matchSkills, recordScore } from './cv_matcher.js';
import { config } from '../config.js';
import { logger } from '../logger.js';

/**
 * Envia el check-in semanal a todos los usuarios con onboarding completo.
 * Se llama automaticamente cada lunes a las 9 AM (hora Mexico).
 */
async function sendWeeklyCheckin(bot) {
  const usuarios = await Profile.find({ onboardingCompleto: true });
  logger.info({ usuarios: usuarios.length }, '⏰ Check-in semanal');

  for (const profile of usuarios) {
    try {
      await bot.telegram.sendMessage(
        profile.telegramId,
        `¡Buenos días, ${profile.nombre}! 👋\n\n` +
          '¿Completaste tu lección de esta semana según tu plan de estudios?',
        Markup.inlineKeyboard([
          Markup.button.callback('✅ Sí, la completé', 'checkin_si'),
          Markup.button.callback('😅 No pude esta semana', 'checkin_no'),
        ])
      );
    } catch (err) {
      logger.error({ err: err.message, telegramId: profile.telegramId }, 'No se pudo enviar check-in');
    }
  }
}

/**
 * Re-calcula el score CV vs mercado de todos los usuarios.
 * Se ejecuta el dia 1 de cada mes a las 10 AM.
 */
async function monthlyRescore(bot) {
  const usuarios = await Profile.find({ onboardingCompleto: true });
  logger.info({ usuarios: usuarios.length }, '📊 Re-score mensual');

  for (const profile of usuarios) {
    try {
      // Los perfiles viejos sin especialidad se saltan (se migran al usar el bot)
      if (!profile.especialidad) continue;

      const res = await fetch(
        `${config.scraperUrl}/skills?especialidad=${encodeURIComponent(profile.especialidad)}&limit=10`
      );
      if (!res.ok) continue;

      const data = await res.json();
      if (!data.skills?.length) continue;

      const { score } = matchSkills(profile.habilidades, data.skills);

      // Captura el score previo ANTES de registrar el nuevo (recordScore puede
      // actualizar la entrada del mes en curso en vez de agregar una nueva)
      const anterior = profile.cvScores.at(-1)?.score ?? 0;
      recordScore(profile, score, profile.especialidad);
      await profile.save();

      // Notifica al usuario si su score subio
      if (score > anterior) {
        await bot.telegram.sendMessage(
          profile.telegramId,
          `📈 *Tu compatibilidad subió a ${score}%* (+${score - anterior}% este mes)\n\n` +
            'Sigue así, cada skill que aprendes te acerca más a tu trabajo ideal.\n' +
            'Usa /progreso para ver tu evolución.',
          { parse_mode: 'Markdown' }
        );
      }
    } catch (err) {
      logger.error({ err: err.message, telegramId: profile.telegramId }, 'Re-score falló');
    }
  }
}

/**
 * Inicia todos los cron jobs. Llamar una vez al arrancar el bot.
 * @param {import('telegraf').Telegraf} bot
 */
export function startScheduler(bot) {
  // Lunes a las 9:00 AM hora Mexico
  cron.schedule('0 9 * * 1', () => sendWeeklyCheckin(bot), {
    timezone: 'America/Mexico_City',
  });

  // Dia 1 de cada mes a las 10:00 AM
  cron.schedule('0 10 1 * *', () => monthlyRescore(bot), {
    timezone: 'America/Mexico_City',
  });

  logger.info('⏰ Scheduler iniciado (check-in lunes 9am, re-score dia 1 cada mes)');
}
````

## File: src/bot/states.js
````javascript
/**
 * Estados de la maquina de conversacion (el "formulario invisible").
 *
 * Cada mensaje del usuario hace avanzar al siguiente estado. El estado actual
 * vive en `profile.conversationState` en MongoDB.
 *
 * Flujo del onboarding:
 *   NEW -> ASK_NOMBRE -> ASK_CARRERA -> ASK_SEMESTRE -> ASK_PROMEDIO
 *       -> ASK_HABILIDADES -> ASK_HORARIO -> DONE
 */
export const STATES = {
  NEW: 'NEW',                     // recien creado, aun no empieza
  ASK_NOMBRE: 'ASK_NOMBRE',
  ASK_CARRERA: 'ASK_CARRERA',
  ASK_ESPECIALIDAD: 'ASK_ESPECIALIDAD', // hacia donde va (dirige todo el bot)
  ASK_OBJETIVO: 'ASK_OBJETIVO',         // tipo de empresa (opcional)
  ASK_SEMESTRE: 'ASK_SEMESTRE',
  ASK_PROMEDIO: 'ASK_PROMEDIO',
  ASK_HABILIDADES: 'ASK_HABILIDADES',
  ASK_NIVEL: 'ASK_NIVEL',               // nivel autopercibido (3 puntos)
  ASK_HORARIO: 'ASK_HORARIO',
  DONE: 'DONE',                   // onboarding terminado

  // Edicion puntual (post-onboarding): editan un solo campo y vuelven a DONE
  // sin re-preguntar todo. Los activan los comandos /habilidades, /horario, /especialidad.
  EDIT_HABILIDADES: 'EDIT_HABILIDADES',
  EDIT_HORARIO: 'EDIT_HORARIO',
  EDIT_ESPECIALIDAD: 'EDIT_ESPECIALIDAD',

  // Mini-flujo del comando /cv (independiente del onboarding). Al terminar
  // genera el PDF en vez de volver al menú.
  CV_ASK_PROYECTOS: 'CV_ASK_PROYECTOS',
  CV_ASK_LOGROS: 'CV_ASK_LOGROS',
  CV_ASK_LINKS: 'CV_ASK_LINKS',
  CV_ASK_EMAIL: 'CV_ASK_EMAIL',
};
````

## File: src/config.js
````javascript
import 'dotenv/config';

/**
 * Carga y valida la configuracion desde variables de entorno.
 * Falla rapido si falta algo critico, para no arrancar el bot a medias.
 */
function required(name) {
  const value = process.env[name];
  if (!value) {
    console.error(`❌ Falta la variable de entorno: ${name}`);
    console.error('   Copia .env.example a .env y completa los valores.');
    process.exit(1);
  }
  return value;
}

export const config = {
  botToken: required('BOT_TOKEN'),
  mongoUri: required('MONGODB_URI'),
  geminiKey: process.env.GEMINI_API_KEY || '',
  groqKey: process.env.GROQ_API_KEY || '',
  env: process.env.NODE_ENV || 'development',
  scraperUrl: process.env.SCRAPER_URL || 'http://localhost:5001',
};
````

## File: src/db.js
````javascript
import dns from 'dns';
import mongoose from 'mongoose';
import { config } from './config.js';
import { logger } from './logger.js';

// Fuerza a Node.js a usar Google DNS, por si el DNS local falla con SRV records
dns.setServers(['8.8.8.8', '8.8.4.4']);

/**
 * Conecta a MongoDB Atlas. Mongoose mantiene un pool de conexiones,
 * asi que se llama una sola vez al arrancar.
 */
export async function connectDB() {
  mongoose.set('strictQuery', true);
  await mongoose.connect(config.mongoUri);
  logger.info('✅ Conectado a MongoDB');
}

export async function disconnectDB() {
  await mongoose.disconnect();
  logger.info('🔌 Desconectado de MongoDB');
}
````

## File: src/index.js
````javascript
import { Telegraf } from 'telegraf';
import { config } from './config.js';
import { connectDB, disconnectDB } from './db.js';
import { logger } from './logger.js';
import { Profile } from './models/profile.js';
import { STATES } from './bot/states.js';
import { steps, resumenPerfil } from './bot/onboarding.js';
import { matchSkills, formatCVReport, recordScore } from './bot/cv_matcher.js';
import { generatePlan } from './bot/planner.js';
import { generarGraficaProgreso } from './bot/progreso.js';
import { startScheduler } from './bot/scheduler.js';
import { cvSteps, generarCV } from './bot/cv_generator.js';

const bot = new Telegraf(config.botToken);

/**
 * Rate limiting simple en memoria: evita que un usuario spamee comandos pesados
 * (sobre todo /plan, que consume cuota de Groq). Se reinicia al reiniciar el bot.
 */
const lastCommand = new Map();

function isRateLimited(telegramId, comando, segundos) {
  const key = `${telegramId}:${comando}`;
  const last = lastCommand.get(key) || 0;
  if (Date.now() - last < segundos * 1000) return true;
  lastCommand.set(key, Date.now());
  return false;
}

/**
 * Migración suave: los perfiles viejos no tienen `especialidad`. Cuando usan un
 * comando que la necesita, los pone a elegirla (sin reiniciar todo el onboarding)
 * y devuelve false para que el comando aborte. El usuario re-ejecuta el comando
 * después de elegir. Devuelve true si el perfil ya tiene especialidad.
 */
async function requireEspecialidad(ctx, profile) {
  if (profile.especialidad) return true;
  profile.conversationState = STATES.EDIT_ESPECIALIDAD;
  await profile.save();
  await ctx.reply(
    'Antes de seguir necesito saber tu especialidad 🎯\n\n' +
      steps[STATES.EDIT_ESPECIALIDAD].prompt(profile) +
      '\n\n_(Después vuelve a escribir el comando que querías)_',
    { parse_mode: 'Markdown' }
  );
  return false;
}

/**
 * Busca el perfil del usuario o lo crea si es nuevo.
 */
async function getOrCreateProfile(ctx) {
  const telegramId = ctx.from.id;
  let profile = await Profile.findOne({ telegramId });
  if (!profile) {
    profile = await Profile.create({
      telegramId,
      username: ctx.from.username,
      conversationState: STATES.NEW,
    });
  }
  return profile;
}

/**
 * Mueve la conversacion a un nuevo estado y envia el prompt correspondiente.
 */
async function transitionTo(ctx, profile, nextState) {
  profile.conversationState = nextState;

  if (nextState === STATES.DONE) {
    profile.onboardingCompleto = true;
    await profile.save();
    await ctx.reply(resumenPerfil(profile));
    return;
  }

  await profile.save();
  const step = steps[nextState];
  if (step) {
    await ctx.reply(step.prompt(profile));
  }
}

// /start — inicia (o reinicia) el onboarding
bot.start(async (ctx) => {
  const profile = await getOrCreateProfile(ctx);
  await ctx.reply(
    'Voy a hacerte unas preguntas rápidas para conocerte. ' +
      'Puedes reiniciar en cualquier momento con /start.'
  );
  await transitionTo(ctx, profile, STATES.ASK_NOMBRE);
});

// /mercado — muestra las top skills del mercado para la carrera del usuario
bot.command('mercado', async (ctx) => {
  const profile = await Profile.findOne({ telegramId: ctx.from.id });
  if (!profile?.onboardingCompleto) {
    return ctx.reply('Primero completa tu perfil con /start 🙂');
  }
  if (isRateLimited(ctx.from.id, 'mercado', 30)) {
    return ctx.reply('Espera unos segundos antes de volver a consultar el mercado ⏳');
  }
  if (!(await requireEspecialidad(ctx, profile))) return;

  await ctx.sendChatAction('typing');
  await ctx.reply('🔍 Buscando el mercado laboral de tu especialidad...');

  try {
    // Primero dispara el scrape para que haya datos
    const scrapeRes = await fetch(`${config.scraperUrl}/scrape`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ especialidad: profile.especialidad }),
    });

    if (!scrapeRes.ok) throw new Error(`Scraper respondió ${scrapeRes.status}`);

    // Luego pide el ranking
    const res = await fetch(
      `${config.scraperUrl}/skills?especialidad=${encodeURIComponent(profile.especialidad)}&limit=5`
    );
    const data = await res.json();

    if (!res.ok || !data.skills?.length) {
      return ctx.reply('No encontré datos del mercado para tu especialidad. Intenta más tarde.');
    }

    const lista = data.skills
      .map((s, i) => `${i + 1}. ${s.skill} — pedida en el ${s.pct}% de vacantes`)
      .join('\n');

    await ctx.reply(
      `📊 Top 5 skills más pedidas en tu especialidad\n` +
        `_(basado en ${data.total_jobs} vacantes en OCC)_\n\n` +
        lista +
        '\n\nUsa /miCV para ver cuántas ya tienes ✅',
      { parse_mode: 'Markdown' }
    );
  } catch (err) {
    logger.error({ err: err.message, telegramId: ctx.from.id }, 'Error en /mercado');
    await ctx.reply('Hubo un error al consultar el mercado. ¿Está corriendo el scraper?');
  }
});

// /plan — genera plan de estudios de 8 semanas con Groq (Llama 3.3 70B)
bot.command('plan', async (ctx) => {
  const profile = await Profile.findOne({ telegramId: ctx.from.id });
  if (!profile?.onboardingCompleto) {
    return ctx.reply('Primero completa tu perfil con /start 🙂');
  }
  if (isRateLimited(ctx.from.id, 'plan', 60)) {
    return ctx.reply('Espera un momento antes de pedir otro plan ⏳');
  }
  if (!(await requireEspecialidad(ctx, profile))) return;

  await ctx.reply('🤖 Generando tu plan de estudios personalizado con IA...');

  try {
    // Obtiene las brechas actuales del mercado de su especialidad
    const res = await fetch(
      `${config.scraperUrl}/skills?especialidad=${encodeURIComponent(profile.especialidad)}&limit=10`
    );
    if (!res.ok) {
      return ctx.reply('Usa /mercado primero para obtener datos del mercado.');
    }
    const data = await res.json();
    const { missing } = matchSkills(profile.habilidades, data.skills);

    if (missing.length === 0) {
      return ctx.reply('¡Ya tienes todas las skills del mercado! Usa /mercado para actualizar el ranking.');
    }

    // Telegram solo muestra "escribiendo..." ~5s; lo renovamos mientras Groq responde
    await ctx.sendChatAction('typing');
    const typing = setInterval(() => ctx.sendChatAction('typing').catch(() => {}), 4000);

    let plan;
    try {
      plan = await generatePlan(profile, missing);
    } finally {
      clearInterval(typing);
    }

    // Telegram tiene limite de 4096 chars por mensaje
    if (plan.length <= 4096) {
      await ctx.reply(plan);
    } else {
      // Parte el plan en dos mensajes si es muy largo
      const mitad = plan.lastIndexOf('\n', 2000);
      await ctx.reply(plan.slice(0, mitad));
      await ctx.reply(plan.slice(mitad + 1));
    }
  } catch (err) {
    logger.error({ err: err.message, telegramId: ctx.from.id }, 'Error en /plan');
    await ctx.reply('Hubo un error al generar el plan. Verifica que GROQ_API_KEY esté configurado.');
  }
});

// /progreso — grafica ASCII de evolucion del score CV
bot.command('progreso', async (ctx) => {
  const profile = await Profile.findOne({ telegramId: ctx.from.id });
  if (!profile?.onboardingCompleto) {
    return ctx.reply('Primero completa tu perfil con /start 🙂');
  }
  const grafica = generarGraficaProgreso(profile.cvScores, profile.especialidad);
  await ctx.reply(grafica, { parse_mode: 'Markdown' });
});

// Respuestas al check-in semanal (botones inline)
bot.action('checkin_si', async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.editMessageText(
    '¡Excelente! 🔥 Cada semana completada te acerca más a tu meta.\n\n' +
    'Usa /plan para ver tu tarea de la próxima semana.'
  );
});

bot.action('checkin_no', async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.editMessageText(
    '¡No pasa nada! 💪 Los mejores también tienen semanas difíciles.\n\n' +
    'Intenta retomar esta semana. Usa /plan para ver tu lección pendiente.'
  );
});

// /becas — convocatorias filtradas por carrera con fecha limite
bot.command('becas', async (ctx) => {
  const profile = await Profile.findOne({ telegramId: ctx.from.id });
  if (!profile?.onboardingCompleto) {
    return ctx.reply('Primero completa tu perfil con /start 🙂');
  }

  await ctx.reply('🔍 Buscando becas para tu perfil...');

  try {
    const params = new URLSearchParams({
      especialidad: profile.especialidad || '',
      carrera: profile.carrera || '',
      limit: '5',
    });
    const res = await fetch(`${config.scraperUrl}/becas?${params}`);
    const data = await res.json();

    if (!res.ok || !data.becas?.length) {
      return ctx.reply('No encontré becas para tu perfil en este momento.');
    }

    const lista = data.becas.map((b) => {
      const urgencia = b.dias_restantes <= 14
        ? '🔴'
        : b.dias_restantes <= 30
        ? '🟡'
        : '🟢';
      return (
        `${urgencia} *${b.nombre}*\n` +
        `🏛️ ${b.institucion}\n` +
        `💰 ${b.monto}\n` +
        `📅 Cierra: ${b.fecha_limite} _(${b.dias_restantes} días)_\n` +
        `🔗 ${b.url}`
      );
    }).join('\n\n─────────────\n\n');

    await ctx.reply(
      `🎓 *Becas disponibles para ${profile.carrera}*\n\n${lista}`,
      { parse_mode: 'Markdown', disable_web_page_preview: true }
    );
  } catch (err) {
    logger.error({ err: err.message, telegramId: ctx.from.id }, 'Error en /becas');
    await ctx.reply('Hubo un error al buscar becas. ¿Está corriendo el scraper?');
  }
});

// /miCV — diagnostico de compatibilidad del CV contra el mercado.
// Registramos ambas grafías: Telegram hace match sensible a mayúsculas y el menú
// de BotFather obliga minúsculas (/micv), así que sin esto el botón del menú falla.
bot.command(['micv', 'miCV'], async (ctx) => {
  const profile = await Profile.findOne({ telegramId: ctx.from.id });
  if (!profile?.onboardingCompleto) {
    return ctx.reply('Primero completa tu perfil con /start 🙂');
  }
  if (isRateLimited(ctx.from.id, 'miCV', 30)) {
    return ctx.reply('Espera unos segundos antes de volver a analizar tu CV ⏳');
  }
  if (!(await requireEspecialidad(ctx, profile))) return;

  await ctx.sendChatAction('typing');
  await ctx.reply('🔍 Analizando tu CV contra el mercado de tu especialidad...');

  try {
    const res = await fetch(
      `${config.scraperUrl}/skills?especialidad=${encodeURIComponent(profile.especialidad)}&limit=10`
    );

    if (!res.ok) {
      return ctx.reply('No hay datos del mercado aún. Usa /mercado primero.');
    }

    const data = await res.json();
    if (!data.skills?.length) {
      return ctx.reply('No hay datos del mercado aún. Usa /mercado primero.');
    }

    const { score, have, missing } = matchSkills(profile.habilidades, data.skills);

    // Guarda snapshot historico (1 por mes y especialidad) para /progreso
    recordScore(profile, score, profile.especialidad);
    await profile.save();

    await ctx.reply(formatCVReport(profile.carrera, score, have, missing), {
      parse_mode: 'Markdown',
    });
  } catch (err) {
    logger.error({ err: err.message, telegramId: ctx.from.id }, 'Error en /miCV');
    await ctx.reply('Hubo un error al analizar tu CV. Intenta más tarde.');
  }
});

// /perfil — muestra lo que el bot sabe de ti
bot.command('perfil', async (ctx) => {
  const profile = await Profile.findOne({ telegramId: ctx.from.id });
  if (!profile || !profile.onboardingCompleto) {
    return ctx.reply('Aún no completas tu perfil. Escribe /start para empezar 🙂');
  }
  await ctx.reply(resumenPerfil(profile));
});

/**
 * Pone al perfil en un estado de edición puntual y le envía el prompt.
 * Al responder, el handler de texto procesa el dato y vuelve a DONE.
 */
async function startEdit(ctx, editState) {
  const profile = await Profile.findOne({ telegramId: ctx.from.id });
  if (!profile?.onboardingCompleto) {
    return ctx.reply('Primero completa tu perfil con /start 🙂');
  }
  profile.conversationState = editState;
  await profile.save();
  await ctx.reply(steps[editState].prompt(profile));
}

// /habilidades — edita solo las habilidades sin rehacer el onboarding
bot.command('habilidades', (ctx) => startEdit(ctx, STATES.EDIT_HABILIDADES));

// /horario — edita solo la disponibilidad sin rehacer el onboarding
bot.command('horario', (ctx) => startEdit(ctx, STATES.EDIT_HORARIO));

// /especialidad — cambia el rumbo (recalcula mercado, CV, plan y becas)
bot.command('especialidad', (ctx) => startEdit(ctx, STATES.EDIT_ESPECIALIDAD));

// /cv — genera un CV estilo Harvard en PDF tras un mini-flujo de 4 preguntas
bot.command('cv', async (ctx) => {
  const profile = await Profile.findOne({ telegramId: ctx.from.id });
  if (!profile?.onboardingCompleto) {
    return ctx.reply('Primero completa tu perfil con /start 🙂');
  }
  profile.conversationState = STATES.CV_ASK_PROYECTOS;
  await profile.save();
  await ctx.reply(cvSteps[STATES.CV_ASK_PROYECTOS].prompt(profile), { parse_mode: 'Markdown' });
});

/**
 * Estructura el contenido con Groq y envía el PDF del CV a Telegram.
 */
async function generarYEnviarCV(ctx, profile) {
  await ctx.reply('🛠️ Armando tu CV estilo Harvard en PDF... (unos segundos)');
  await ctx.sendChatAction('upload_document');
  try {
    const { buffer, filename } = await generarCV(profile);
    await ctx.replyWithDocument(
      { source: buffer, filename },
      { caption: '📄 ¡Listo! Tu CV estilo Harvard. Revísalo y ajústalo si hace falta 😉' }
    );
  } catch (err) {
    logger.error({ err: err.message, telegramId: ctx.from.id }, 'Error generando CV');
    await ctx.reply('Hubo un error al generar tu CV. Intenta de nuevo en un momento.');
  }
}

// Mensajes de texto — avanzan la maquina de estados
bot.on('text', async (ctx) => {
  const profile = await getOrCreateProfile(ctx);
  const state = profile.conversationState;

  // Si no esta en medio del onboarding, guialo
  if (state === STATES.NEW || state === STATES.DONE) {
    return ctx.reply('Escribe /start para (re)hacer tu perfil o /perfil para verlo 🙂');
  }

  // El mini-flujo de /cv usa su propio registro de pasos (cvSteps)
  const step = cvSteps[state] || steps[state];
  if (!step) {
    // Estado desconocido: reinicia por seguridad
    return transitionTo(ctx, profile, STATES.ASK_NOMBRE);
  }

  const result = step.handle(ctx.message.text, profile);
  if (!result.ok) {
    await profile.save(); // por si el handle dejo algo a medias
    return ctx.reply(result.error);
  }

  // Fin del flujo /cv: vuelve a DONE y genera el PDF
  if (result.generateCV) {
    profile.conversationState = STATES.DONE;
    await profile.save();
    return generarYEnviarCV(ctx, profile);
  }

  await transitionTo(ctx, profile, result.next);
});

// Manejo basico de errores para no tumbar el proceso
bot.catch((err, ctx) => {
  logger.error({ err, telegramId: ctx?.from?.id }, 'Error procesando update');
});

process.on('unhandledRejection', (reason) => {
  logger.error({ reason: reason?.message ?? reason }, 'Unhandled rejection');
});

async function main() {
  await connectDB();
  logger.info('Lanzando bot...');
  try {
    await bot.launch();
    startScheduler(bot);
    logger.info('🤖 Bot en marcha. Habla con él en Telegram.');
  } catch (err) {
    logger.error({ err: err?.message ?? err }, 'Error en bot.launch()');
    process.exit(1);
  }
}

process.once('SIGINT', async () => {
  bot.stop('SIGINT');
  await disconnectDB();
});
process.once('SIGTERM', async () => {
  bot.stop('SIGTERM');
  await disconnectDB();
});

main();
````

## File: src/logger.js
````javascript
import pino from 'pino';

/**
 * Logger estructurado para toda la app.
 *
 * - En desarrollo: salida bonita y coloreada (pino-pretty) para leer en consola.
 * - En producción: JSON puro, que Railway/Logtail pueden indexar y filtrar.
 *
 * Nivel configurable con LOG_LEVEL (default: info).
 */
const isDev = (process.env.NODE_ENV || 'development') !== 'production';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: isDev
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss',
          ignore: 'pid,hostname',
        },
      }
    : undefined,
});
````

## File: src/models/profile.js
````javascript
import mongoose from 'mongoose';
import { STATES } from '../bot/states.js';

/**
 * Perfil del estudiante.
 *
 * Guarda tanto los datos del onboarding como el estado de la conversacion
 * (`conversationState`). Persistir el estado en la base — en vez de en memoria —
 * hace que el bot sobreviva reinicios/redeploys en Railway sin perder el hilo.
 */
const profileSchema = new mongoose.Schema(
  {
    // Identidad de Telegram (clave unica del usuario)
    telegramId: { type: Number, required: true, unique: true, index: true },
    username: { type: String },

    // Datos del onboarding
    nombre: { type: String },
    carrera: { type: String },

    // Capa de precisión: especialidad dirige mercado/CV/plan/becas.
    // `especialidad` es requerida tras el onboarding; los perfiles viejos no la
    // tienen y se migran en caliente (ver requireEspecialidad en index.js).
    especialidad: { type: String },
    objetivo: { type: String },   // tipo de empresa (opcional)
    nivel: { type: String },      // autopercibido: principiante|intermedio|avanzado

    semestre: { type: Number },
    promedio: { type: Number },
    habilidades: { type: [String], default: [] },

    // Datos extra para el CV (los pregunta /cv, no el onboarding)
    email: { type: String },
    github: { type: String },
    linkedin: { type: String },
    proyectos: { type: [String], default: [] },
    logros: { type: [String], default: [] },

    // Horario disponible por dia (ej. { lunes: "19:00-21:00", sabado: "09:00-13:00" })
    horario: { type: Map, of: String, default: {} },

    // Maquina de estados de la conversacion
    conversationState: {
      type: String,
      enum: Object.values(STATES),
      default: STATES.NEW,
    },

    // true cuando termino el onboarding completo
    onboardingCompleto: { type: Boolean, default: false },

    // Historial de scores de compatibilidad CV vs mercado (Fase 3 y 6).
    // Guarda contra qué especialidad se calculó: si cambias de especialidad,
    // /progreso filtra para no comparar peras con manzanas.
    cvScores: {
      type: [{ score: Number, fecha: Date, especialidad: String }],
      default: [],
    },
  },
  { timestamps: true } // createdAt + updatedAt automaticos
);

export const Profile = mongoose.model('Profile', profileSchema);
````
