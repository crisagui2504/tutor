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
| **Forecasted self** | Proyección del score hacia adelante: cuánto subiría si el usuario aprende las skills que más le faltan (en orden de demanda). En `proyectarEscenarios()`, comando `/simular`. |
| **Puntos / Racha / Nivel** | Gamificación (`gamificacion.js`). Puntos: +10 por acierto en `/quiz`, +50 por check-in semanal "sí". Nivel = puntos/100. Racha = semanas consecutivas completando el check-in (0 al fallar). |
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
| `/simular` (`/futuro`) | "Forecasted self": proyecta tu score si aprendes lo que más falta |
| `/comparar` | Tu score de compatibilidad en cada una de las 5 especialidades, rankeadas |
| `/puntos` | Puntos, nivel y racha semanal (gamificación) |
| `/plan` | Plan de estudios de 8 semanas con Groq |
| `/quiz` | Quiz interactivo corto (3 preguntas, botones, feedback inmediato) |
| `/becas` | Becas filtradas por carrera con días restantes |
| `/progreso` | Gráfica ASCII del historial de scores |
| `/cv` | Genera un CV estilo Harvard en PDF (mini-flujo de 4 preguntas) |
