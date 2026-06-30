const MESES = ['Ene','Feb','Mar','Abr','May','Jun',
               'Jul','Ago','Sep','Oct','Nov','Dic'];

/**
 * Genera una grafica ASCII del historial de scores CV vs mercado.
 * Compatible con Telegram (usa bloque de codigo para alineacion).
 *
 * Filtra por la especialidad actual: los scores de otra especialidad no son
 * comparables (mercados distintos), así que no se mezclan en la misma gráfica.
 *
 * @param {Array<{score:number, fecha:Date, especialidad?:string}>} cvScores
 * @param {string} [especialidad] - si se da, solo muestra scores de esa especialidad
 */
export function generarGraficaProgreso(cvScores, especialidad) {
  // Solo el historial de la especialidad actual (los viejos sin especialidad
  // se incluyen como compatibilidad hacia atrás cuando no hay filtro claro)
  const relevantes = especialidad
    ? (cvScores || []).filter((s) => !s.especialidad || s.especialidad === especialidad)
    : cvScores || [];

  if (!relevantes.length) {
    return (
      'Aún no tienes historial de progreso para esta especialidad.\n' +
      'Usa /miCV para hacer tu primer diagnóstico.'
    );
  }

  const ultimos = relevantes.slice(-6);

  const lineas = ultimos.map(({ score, fecha }) => {
    const d = new Date(fecha);
    const etiqueta = `${MESES[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`;
    const bloques = Math.round(score / 10);
    const barra = '█'.repeat(bloques) + '░'.repeat(10 - bloques);
    return `${etiqueta.padEnd(7)} ${String(score + '%').padEnd(5)} ${barra}`;
  });

  const ultimo = ultimos.at(-1).score;
  const primero = ultimos[0].score;
  const diff = ultimo - primero;
  const tendencia = diff > 0 ? `+${diff}%` : `${diff}%`;
  const emoji = diff > 0 ? '🚀' : diff === 0 ? '➡️' : '📉';

  return (
    '📈 *Tu progreso de compatibilidad con el mercado*\n\n' +
    '```\n' +
    'Mes     Score  Gráfica\n' +
    '──────────────────────\n' +
    lineas.join('\n') +
    '\n```\n\n' +
    `${emoji} Evolución: *${tendencia}* en ${ultimos.length} medición(es)\n` +
    `Score actual: *${ultimo}%*\n\n` +
    'Usa /miCV para actualizar · /plan para seguir estudiando'
  );
}
