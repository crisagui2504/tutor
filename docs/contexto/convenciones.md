# Convenciones

## Lenguaje y módulos

- **Node.js**: ESM puro (`"type": "module"` en package.json). Usar `import/export`, nunca `require()`.
- **Python**: módulos sueltos importados directamente (`from scraper import scrape_occ`), sin paquete instalable.
- **Idioma del código**: español para nombres de dominio (`perfil`, `carrera`, `horario`), inglés para infraestructura (`connectDB`, `matchSkills`, `save_ranking`).

## Naming

| Elemento | Convención | Ejemplo |
|----------|-----------|---------|
| Archivos Node | lowercase / snake_case | `cv_matcher.js`, `scraper_client.js`, `onboarding.js` |
| Archivos Python | snake_case | `scraper.py`, `becas.py` |
| Funciones Node | camelCase | `matchSkills()`, `generatePlan()` |
| Funciones Python | snake_case | `filtrar_becas()`, `rank_skills()` |
| Constantes | UPPER_SNAKE | `STATES`, `SKILLS_CATALOG`, `SEED_DATA` |
| Colecciones Mongo | plural lowercase | `profiles`, `skill_rankings` |
| Variables de entorno | UPPER_SNAKE | `BOT_TOKEN`, `MONGODB_URI` |

## Estilo Node.js

- Linter/formatter: **ESLint** (flat config, `eslint.config.js`) + **Prettier** (`.prettierrc.json`). Corre `npm run lint` y `npm run format`. Prettier manda en el estilo (comillas simples, punto y coma, ancho 100).
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
  `/plan` 60s; `/mercado`, `/miCV`, `/comparar`, `/quiz`, `/entrevista` 30s; `/simular` 20s.
  Map en memoria, se reinicia con el bot.

## Comunicación entre servicios

- Todas las llamadas Node→Python pasan por `src/bot/scraper_client.js` (URL base +
  header `X-API-Key`). No hagas `fetch` directo al scraper desde los comandos.
- El scraper valida `X-API-Key` contra `API_SECRET_KEY` (si está configurada).
  Vacía = auth off (solo local). `/health` queda siempre abierto.

## Validación de salida de LLM

- Todo JSON que devuelve Groq se valida con **Zod** antes de usarlo: `CV_SCHEMA`
  (`cv_generator.js`), `QUIZ_SCHEMA` (`quiz.js`), `PREGUNTAS_SCHEMA`/`EVAL_SCHEMA`
  (`entrevista.js`). Si no cumple el esquema, se cae al fallback o se reintenta.

## Tests

- **Node**: Vitest. Corre `npm test`. Tests en `tests/*.test.js`, cubren la lógica
  pura (matchSkills, recordScore, proyectarEscenarios, gamificación, FSM del
  onboarding, progreso, especialidades).
- **Python**: pytest. Corre `cd scraper && python -m pytest`. Test en
  `scraper/test_logic.py` (extractor, JSON-LD, multi-query, becas) — sin red ni DB,
  con `monkeypatch` para `_scrape_query`.
- Regla: la lógica nueva pura va con su test. No se prueban comandos que tocan
  Telegram/Mongo/Groq end-to-end (se validan a mano).
- Lint: `npm run lint` y `ruff check scraper`.

## Commits

- Repo en GitHub: https://github.com/crisagui2504/tutor (rama `main`).
- Mensajes con un título corto en presente + cuerpo explicando el porqué; cada
  commit cierra co-autoría con `Co-Authored-By: Claude ...`.
- Antes de subir: `npm test`, `npm run lint`, y verificar que `.env` NO quede
  staged (está en `.gitignore`; el repo es público).
