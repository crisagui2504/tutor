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
