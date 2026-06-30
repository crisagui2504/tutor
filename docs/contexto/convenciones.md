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
