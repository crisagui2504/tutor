/**
 * Aliases para normalizar lo que el usuario escribe en el onboarding
 * contra los nombres canonicos del mercado.
 * Ej: "js" -> "JavaScript", "node" -> "Node.js", "ingles" -> "inglés"
 */
const ALIASES = {
  js: 'JavaScript', javascript: 'JavaScript',
  ts: 'TypeScript', typescript: 'TypeScript',
  'node': 'Node.js', nodejs: 'Node.js', 'node.js': 'Node.js',
  reactjs: 'React', 'react.js': 'React',
  vuejs: 'Vue', 'vue.js': 'Vue',
  angularjs: 'Angular', 'angular.js': 'Angular',
  py: 'Python',
  postgres: 'PostgreSQL', postgresql: 'PostgreSQL',
  mongo: 'MongoDB',
  k8s: 'Kubernetes',
  csharp: 'C#',
  cpp: 'C++',
  golang: 'Go',
  dotnet: '.NET', '.net': '.NET',
  spring: 'Spring Boot', 'spring boot': 'Spring Boot',
  nestjs: 'NestJS',
  ml: 'Machine Learning',
  dl: 'Deep Learning',
  powerbi: 'Power BI', 'power bi': 'Power BI',
  ingles: 'inglés', english: 'inglés',
  'inglés avanzado': 'inglés', 'inglés b2': 'inglés', 'inglés c1': 'inglés',
  'inglés intermedio': 'inglés', 'inglés técnico': 'inglés',
};

function normalize(skill) {
  const lower = skill.toLowerCase().trim();
  return (ALIASES[lower] || skill.trim()).toLowerCase();
}

/**
 * Compara las habilidades del usuario contra el top de skills del mercado.
 * Devuelve { score, have, missing }.
 *
 * @param {string[]} userSkills  - profile.habilidades
 * @param {Array<{skill:string}>} marketSkills - top skills del endpoint /skills
 */
export function matchSkills(userSkills, marketSkills) {
  const userSet = new Set(userSkills.map(normalize));

  const have = [];
  const missing = [];

  for (const { skill } of marketSkills) {
    if (userSet.has(normalize(skill))) {
      have.push(skill);
    } else {
      missing.push(skill);
    }
  }

  const score = Math.round((have.length / marketSkills.length) * 100);
  return { score, have, missing };
}

/**
 * Registra un score en el historial del perfil, con UNA entrada por mes y
 * especialidad. Guarda contra qué especialidad se midió, para que /progreso no
 * compare peras (datos) con manzanas (ciberseguridad) si cambiaste de rumbo.
 *
 * Si ya hay una medición de este mes-año Y misma especialidad, la actualiza
 * (refleja mejoras al volver a correr /miCV el mismo mes); si no, agrega una
 * nueva. Mantiene un máximo de 12 entradas. Muta `profile.cvScores`.
 *
 * @param {{cvScores: Array<{score:number, fecha:Date, especialidad:string}>}} profile
 * @param {number} score
 * @param {string} especialidad
 */
export function recordScore(profile, score, especialidad) {
  const ahora = new Date();
  const mismaEntrada = profile.cvScores.find((s) => {
    const d = new Date(s.fecha);
    return (
      d.getMonth() === ahora.getMonth() &&
      d.getFullYear() === ahora.getFullYear() &&
      s.especialidad === especialidad
    );
  });

  if (mismaEntrada) {
    mismaEntrada.score = score;
    mismaEntrada.fecha = ahora;
  } else {
    profile.cvScores.push({ score, fecha: ahora, especialidad });
    if (profile.cvScores.length > 12) profile.cvScores.shift();
  }
}

/**
 * Genera el mensaje de diagnostico para Telegram (formato Markdown).
 */
export function formatCVReport(carrera, score, have, missing) {
  const emoji =
    score >= 80 ? '🔥' : score >= 60 ? '💪' : score >= 40 ? '📈' : '🌱';

  const haveText =
    have.length > 0
      ? have.map((s) => `✅ ${s}`).join('\n')
      : '  _(ninguna del top de mercado aún)_';

  const missingText =
    missing.length > 0
      ? missing.map((s) => `❌ ${s}`).join('\n')
      : '  ¡Ya tienes todo! 🏆';

  return (
    `${emoji} *Diagnóstico de tu CV*\n\n` +
    `Carrera: *${carrera}*\n` +
    `Compatibilidad con el mercado: *${score}%*\n\n` +
    `*Ya tienes:*\n${haveText}\n\n` +
    `*Te falta para llegar al 100%:*\n${missingText}\n\n` +
    `Usa /plan para generar tu plan de estudios personalizado 📅`
  );
}
