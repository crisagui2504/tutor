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
