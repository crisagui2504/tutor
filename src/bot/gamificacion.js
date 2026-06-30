/**
 * Sistema de puntos y racha. Cierra el loop de engagement: el /quiz y el check-in
 * semanal otorgan puntos; mantener actividad semana a semana sube la racha.
 *
 * - Puntos: acumulables, definen el nivel (cada 100 puntos = 1 nivel).
 * - Racha: semanas consecutivas completando el check-in (se reinicia al fallar).
 *
 * Todas las funciones MUTAN el profile en memoria; el caller hace save().
 */
const PUNTOS_POR_NIVEL = 100;

export function nivel(puntos) {
  return Math.floor((puntos || 0) / PUNTOS_POR_NIVEL) + 1;
}

function progresoNivel(puntos) {
  return (puntos || 0) % PUNTOS_POR_NIVEL; // 0-99
}

/**
 * Suma puntos al perfil. Devuelve el total y si subió de nivel.
 */
export function otorgarPuntos(profile, cantidad) {
  const nivelAntes = nivel(profile.puntos);
  profile.puntos = (profile.puntos || 0) + cantidad;
  const nivelDespues = nivel(profile.puntos);
  return {
    total: profile.puntos,
    subioNivel: nivelDespues > nivelAntes,
    nivel: nivelDespues,
  };
}

/**
 * Actualiza la racha semanal: +1 si hubo actividad, 0 si se rompió.
 */
export function actualizarRacha(profile, exito) {
  profile.racha = exito ? (profile.racha || 0) + 1 : 0;
  profile.ultimaActividad = new Date();
  return profile.racha;
}

/**
 * Mensaje de estado de gamificación para /puntos (Markdown).
 */
export function formatPuntos(profile) {
  const puntos = profile.puntos || 0;
  const nv = nivel(puntos);
  const prog = progresoNivel(puntos);
  const llenos = Math.round(prog / 10);
  const barra = '█'.repeat(llenos) + '░'.repeat(10 - llenos);
  const racha = profile.racha || 0;
  const fuego = racha > 0 ? '🔥'.repeat(Math.min(racha, 5)) : '🥶';

  return (
    '🏆 *Tu progreso*\n\n' +
    `⭐ Puntos: *${puntos}*\n` +
    `📊 Nivel *${nv}*   \`${barra}\`   ${prog}/100\n` +
    `${fuego} Racha: *${racha}* semana(s)\n\n` +
    'Gana puntos con /quiz y completando tu check-in semanal de los lunes.'
  );
}
