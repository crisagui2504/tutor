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
