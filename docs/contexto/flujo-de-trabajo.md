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
