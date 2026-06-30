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
