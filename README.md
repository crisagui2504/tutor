# Asistente de Carrera — Bot de Telegram

Bot que conoce al estudiante mediante un onboarding conversacional, detecta sus
brechas de habilidades frente al mercado laboral **de su especialidad**, le arma
un plan de estudios personalizado con IA, lo refuerza con quizzes y entrevistas
simuladas, lo gamifica con puntos y racha, le encuentra becas y le genera un CV
estilo Harvard en PDF.

> Documentación detallada (arquitectura, convenciones, decisiones, glosario,
> flujo de trabajo y gotchas) en [`docs/contexto/`](docs/contexto/).

## Stack

- **Node.js 20+** + **Telegraf.js** — bot de Telegram
- **Python 3.11 + Flask** — scraper de mercado, API de skills/becas y dashboard (puerto 5001)
- **MongoDB Atlas** — perfil del estudiante y rankings de skills
- **Groq (Llama 3.3 70B)** — plan de estudios, CV, quiz y entrevista; salida validada con **Zod**
- **PDFKit** — CV estilo Harvard en PDF (JS puro, Times-Roman incluido)
- **pino** — logging estructurado · **node-cron / APScheduler** — tareas programadas
- **Vitest** + **pytest** — tests de la lógica pura · **ESLint/Prettier/Ruff** — lint

## La capa de especialidad

El bot no trata "Ingeniería en Sistemas" como una sola cosa: pregunta una
**especialidad** (desarrollo web, datos/IA, ciberseguridad, DevOps/cloud, redes)
que dirige todo — mercado, diagnóstico de CV, plan y becas. Las keys son un
contrato compartido entre `src/bot/especialidades.js` (Node) y `scraper.py` (Python).

## Comandos

| Comando | Qué hace |
| --- | --- |
| `/start` | Onboarding conversacional (perfil + especialidad + objetivo + nivel) |
| `/perfil` | Muestra el perfil guardado |
| `/especialidad` | Cambia la especialidad (recalcula todo) |
| `/habilidades` · `/horario` | Edita un campo sin rehacer el onboarding |
| `/mercado` | Top skills más pedidas en tu especialidad |
| `/miCV` | Diagnóstico de compatibilidad CV vs mercado |
| `/simular` (`/futuro`) | "Forecasted self": proyecta tu score si aprendes lo que falta |
| `/comparar` | Tu compatibilidad en las 5 especialidades, rankeadas |
| `/plan` | Plan de estudios de 8 semanas (IA, recursos por especialidad) |
| `/quiz` | Quiz interactivo corto (botones, feedback inmediato) |
| `/entrevista` | Entrevista técnica simulada (preguntas abiertas evaluadas por IA) |
| `/puntos` | Puntos, nivel y racha semanal (gamificación) |
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
    ├── scraper_client.js Cliente del scraper (URL base + auth X-API-Key)
    ├── cv_matcher.js     COMPARA skills (matchSkills, recordScore, proyectarEscenarios)
    ├── cv_generator.js   ARMA el CV: mini-flujo /cv + Groq + PDF (PDFKit)
    ├── planner.js        Genera el plan con Groq
    ├── quiz.js           Quiz interactivo (Groq + Zod, estado en memoria)
    ├── entrevista.js     Entrevista simulada (preguntas abiertas evaluadas por Groq)
    ├── gamificacion.js   Puntos, nivel y racha
    ├── progreso.js       Gráfica ASCII del historial de scores
    └── scheduler.js      Crons: check-in semanal + re-score mensual

scraper/                  API Python (Flask, puerto 5001)
├── app.py                Endpoints: /skills /scrape /becas /especialidades /metrics /dashboard
├── scraper.py            Scrape OCC (JSON-LD + multi-query) → fallback a SEED_DATA
├── extractor.py          Catálogo de skills + keyword matching
├── becas.py              Catálogo de becas + filtrado por relevancia
├── models.py             Persistencia + métricas (pymongo, fix DNS Google)
└── test_logic.py         Tests pytest de la lógica del scraper

tests/                    Tests Vitest de la lógica Node
scripts/verificar-plan.mjs  Comprueba que /plan sea personalizado (npm run verify:plan)
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
| `GROQ_API_KEY` | sí (para `/plan`, `/cv`, `/quiz`, `/entrevista`) | LLM en la nube |
| `GROQ_MODEL` | no | Modelo Groq (default `llama-3.3-70b-versatile`) |
| `API_SECRET_KEY` | no (recomendado en prod) | Secreto compartido bot↔scraper. Vacío = auth off |
| `SCRAPER_URL` | no | URL del scraper (default `http://localhost:5001`) |
| `LOG_LEVEL` | no | Nivel de logs (default `info`) |

## Tests y calidad

```bash
npm test                        # Vitest (lógica Node)
cd scraper && python -m pytest   # pytest (lógica del scraper)
npm run lint                    # ESLint   ·   ruff check scraper
npm run verify:plan             # comprueba que /plan sea personalizado, no genérico
```

## Dashboard de métricas

Con el bot corriendo, abre `http://localhost:5001/dashboard?key=<API_SECRET_KEY>`
(o sin `?key=` si la auth está desactivada en local). Muestra usuarios, % de
onboarding, distribución por especialidad, score y puntos promedio.

## Despliegue en Railway

1. Sube este repo a GitHub.
2. Railway → *New Project* → *Deploy from GitHub*.
3. Agrega las variables de entorno (incluido `NODE_ENV=production`).
4. El `Procfile` ya define `worker: npm start`. El scraper Python necesita un
   segundo servicio (`py scraper/app.py`).
