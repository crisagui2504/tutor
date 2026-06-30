import { config } from '../config.js';

/**
 * Cliente del scraper Python. Centraliza la URL base y la autenticación
 * (header X-API-Key) para no repetirla en cada comando. Devuelve el objeto
 * Response de fetch para que el caller maneje res.ok / res.json() como antes.
 */
function headers(extra = {}) {
  const h = { ...extra };
  if (config.apiSecret) h['X-API-Key'] = config.apiSecret;
  return h;
}

/** GET /skills?especialidad=&limit= */
export function scraperSkills(especialidad, limit = 5) {
  const url = `${config.scraperUrl}/skills?especialidad=${encodeURIComponent(especialidad)}&limit=${limit}`;
  return fetch(url, { headers: headers() });
}

/** POST /scrape  body { especialidad } */
export function scraperScrape(especialidad) {
  return fetch(`${config.scraperUrl}/scrape`, {
    method: 'POST',
    headers: headers({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ especialidad }),
  });
}

/** GET /becas?especialidad=&carrera=&limit= */
export function scraperBecas(especialidad, carrera, limit = 5) {
  const params = new URLSearchParams({
    especialidad: especialidad || '',
    carrera: carrera || '',
    limit: String(limit),
  });
  return fetch(`${config.scraperUrl}/becas?${params}`, { headers: headers() });
}
