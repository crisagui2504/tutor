import { STATES } from './states.js';
import {
  ESPECIALIDADES,
  ESPECIALIDAD_DEFAULT,
  OBJETIVOS,
  NIVELES,
  renderMenu,
  parseSeleccion,
  labelDe,
} from './especialidades.js';

/**
 * Define cada paso del onboarding como una transicion de la maquina de estados:
 *
 *   prompt(profile)        -> texto que el bot envia al ENTRAR a este estado
 *   handle(text, profile)  -> procesa la respuesta del usuario.
 *                             Devuelve { ok, error?, next } donde:
 *                               - ok:    true si la respuesta fue valida
 *                               - error: mensaje a mostrar si ok=false (se re-pregunta)
 *                               - next:  estado siguiente si ok=true
 *                             Muta `profile` con el dato capturado.
 *
 * Para agregar un paso nuevo basta con anadir una entrada aqui y el estado en states.js.
 */
export const steps = {
  [STATES.ASK_NOMBRE]: {
    prompt: () => '👋 ¡Hola! Soy tu asistente de carrera. Para empezar, ¿cómo te llamas?',
    handle: (text, profile) => {
      const nombre = text.trim();
      if (nombre.length < 2) {
        return { ok: false, error: 'Escribe un nombre válido por favor 🙂' };
      }
      profile.nombre = nombre;
      return { ok: true, next: STATES.ASK_CARRERA };
    },
  },

  [STATES.ASK_CARRERA]: {
    prompt: (profile) => `Mucho gusto, ${profile.nombre}. ¿Qué carrera estudias?`,
    handle: (text, profile) => {
      const carrera = text.trim();
      if (carrera.length < 2) {
        return { ok: false, error: 'Dime el nombre de tu carrera 📚' };
      }
      profile.carrera = carrera;
      return { ok: true, next: STATES.ASK_ESPECIALIDAD };
    },
  },

  [STATES.ASK_ESPECIALIDAD]: {
    prompt: () =>
      '¿En qué te quieres especializar? Responde con el número:\n\n' +
      renderMenu(ESPECIALIDADES) +
      `\n${ESPECIALIDADES.length + 1}. 🤔 Aún no lo sé`,
    handle: (text, profile) => handleEspecialidad(text, profile, STATES.ASK_OBJETIVO),
  },

  [STATES.ASK_OBJETIVO]: {
    prompt: () =>
      '¿Dónde te gustaría trabajar? (opcional — escribe *0* para saltar)\n\n' +
      renderMenu(OBJETIVOS),
    handle: (text, profile) => {
      const limpio = text.trim().toLowerCase();
      if (limpio === '0' || limpio === 'saltar' || limpio === 'no se' || limpio === 'no sé') {
        profile.objetivo = undefined;
        return { ok: true, next: STATES.ASK_SEMESTRE };
      }
      const key = parseSeleccion(text, OBJETIVOS);
      if (!key) {
        return { ok: false, error: 'Elige un número del 1 al 5, o 0 para saltar 🙂' };
      }
      profile.objetivo = key;
      return { ok: true, next: STATES.ASK_SEMESTRE };
    },
  },

  [STATES.ASK_SEMESTRE]: {
    prompt: () => '¿En qué semestre vas? (un número del 1 al 14)',
    handle: (text, profile) => {
      const semestre = Number(text.trim());
      if (!Number.isInteger(semestre) || semestre < 1 || semestre > 14) {
        return { ok: false, error: 'Escribe solo un número entre 1 y 14 🔢' };
      }
      profile.semestre = semestre;
      return { ok: true, next: STATES.ASK_PROMEDIO };
    },
  },

  [STATES.ASK_PROMEDIO]: {
    prompt: () => '¿Cuál es tu promedio actual? (escala 0 a 10, ej. 8.5)',
    handle: (text, profile) => {
      const promedio = Number(text.trim().replace(',', '.'));
      if (Number.isNaN(promedio) || promedio < 0 || promedio > 10) {
        return { ok: false, error: 'Dame un promedio entre 0 y 10 (ej. 8.5) 📊' };
      }
      profile.promedio = promedio;
      return { ok: true, next: STATES.ASK_HABILIDADES };
    },
  },

  [STATES.ASK_HABILIDADES]: {
    prompt: () =>
      '¿Qué habilidades técnicas ya tienes? Sepáralas con comas.\n' +
      'Ej: Python, SQL, Git, inglés B1',
    handle: (text, profile) => handleHabilidades(text, profile, STATES.ASK_NIVEL),
  },

  [STATES.ASK_NIVEL]: {
    prompt: () =>
      '¿Cómo describes tu nivel técnico actual? Responde con el número:\n\n' +
      renderMenu(NIVELES),
    handle: (text, profile) => handleNivel(text, profile, STATES.ASK_HORARIO),
  },

  [STATES.ASK_HORARIO]: {
    prompt: () =>
      '¡Casi listo! ¿Qué días y horas tienes libres para estudiar?\n' +
      'Formato: día hora-hora, uno por línea o separado por comas.\n' +
      'Ej: lunes 19:00-21:00, miércoles 19:00-21:00, sábado 09:00-13:00',
    handle: (text, profile) => handleHorario(text, profile, STATES.DONE),
  },

  // --- Edicion puntual: reutilizan la misma logica pero vuelven a DONE ---
  [STATES.EDIT_HABILIDADES]: {
    prompt: () =>
      'Actualiza tus habilidades (sepáralas con comas).\n' +
      'Ej: Python, SQL, React, Docker, inglés B2',
    handle: (text, profile) => handleHabilidades(text, profile, STATES.DONE),
  },

  [STATES.EDIT_HORARIO]: {
    prompt: () =>
      'Actualiza tu disponibilidad para estudiar.\n' +
      'Ej: lunes 19:00-21:00, miércoles 19:00-21:00, sábado 09:00-13:00',
    handle: (text, profile) => handleHorario(text, profile, STATES.DONE),
  },

  [STATES.EDIT_ESPECIALIDAD]: {
    prompt: () =>
      'Elige tu especialidad. Responde con el número:\n\n' +
      renderMenu(ESPECIALIDADES) +
      `\n${ESPECIALIDADES.length + 1}. 🤔 Aún no lo sé`,
    handle: (text, profile) => handleEspecialidad(text, profile, STATES.DONE),
  },
};

/**
 * Parsea la especialidad elegida (número o texto). La opción "aún no lo sé"
 * (último número) cae al default razonable. Compartido por onboarding y edición.
 */
function handleEspecialidad(text, profile, next) {
  const limpio = text.trim().toLowerCase();

  // "Aún no lo sé" = la opción extra después de la lista
  if (limpio === String(ESPECIALIDADES.length + 1) || limpio.includes('no lo s')) {
    profile.especialidad = ESPECIALIDAD_DEFAULT;
    return { ok: true, next };
  }

  const key = parseSeleccion(text, ESPECIALIDADES);
  if (!key) {
    return {
      ok: false,
      error: `Elige un número del 1 al ${ESPECIALIDADES.length + 1} 🙂`,
    };
  }
  profile.especialidad = key;
  return { ok: true, next };
}

/**
 * Parsea el nivel autopercibido (número o texto).
 */
function handleNivel(text, profile, next) {
  const key = parseSeleccion(text, NIVELES);
  if (!key) {
    return { ok: false, error: 'Elige 1 (principiante), 2 (intermedio) o 3 (avanzado) 🙂' };
  }
  profile.nivel = key;
  return { ok: true, next };
}

/**
 * Parsea y valida habilidades, las guarda en el perfil y transiciona a `next`.
 * Compartido por el onboarding (ASK_*) y la edición puntual (EDIT_*).
 */
function handleHabilidades(text, profile, next) {
  const habilidades = text
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (habilidades.length === 0) {
    return { ok: false, error: 'Escribe al menos una habilidad 🛠️' };
  }
  profile.habilidades = habilidades;
  return { ok: true, next };
}

/**
 * Parsea y valida el horario, lo guarda en el perfil y transiciona a `next`.
 */
function handleHorario(text, profile, next) {
  const horario = parseHorario(text);
  if (Object.keys(horario).length === 0) {
    return {
      ok: false,
      error: 'No entendí el horario. Usa: lunes 19:00-21:00, sábado 09:00-13:00 🗓️',
    };
  }
  profile.horario = horario;
  return { ok: true, next };
}

const DIAS = ['lunes', 'martes', 'miércoles', 'miercoles', 'jueves', 'viernes', 'sábado', 'sabado', 'domingo'];

/**
 * Convierte texto libre en un mapa { dia: "HH:MM-HH:MM" }.
 * Tolera acentos y separacion por comas o saltos de linea.
 */
function parseHorario(text) {
  const horario = {};
  const partes = text.toLowerCase().split(/[\n,]+/);
  for (const parte of partes) {
    const dia = DIAS.find((d) => parte.includes(d));
    const rango = parte.match(/(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/);
    if (dia && rango) {
      // Normaliza el dia sin acento como clave
      const clave = dia.replace('miércoles', 'miercoles').replace('sábado', 'sabado');
      horario[clave] = `${rango[1]}-${rango[2]}`;
    }
  }
  return horario;
}

/**
 * Resumen legible del perfil, se muestra al terminar el onboarding.
 */
export function resumenPerfil(profile) {
  const horario = Object.entries(Object.fromEntries(profile.horario))
    .map(([dia, rango]) => `   • ${dia}: ${rango}`)
    .join('\n');

  const especialidad = profile.especialidad
    ? labelDe(profile.especialidad, ESPECIALIDADES)
    : '—';
  const objetivo = profile.objetivo ? labelDe(profile.objetivo, OBJETIVOS) : '—';
  const nivel = profile.nivel ? labelDe(profile.nivel, NIVELES) : '—';

  return (
    `✅ ¡Perfil completo, ${profile.nombre}!\n\n` +
    `🎓 Carrera: ${profile.carrera}\n` +
    `🎯 Especialidad: ${especialidad}\n` +
    `🏢 Objetivo: ${objetivo}\n` +
    `📅 Semestre: ${profile.semestre}\n` +
    `📊 Promedio: ${profile.promedio}\n` +
    `🛠️ Habilidades: ${profile.habilidades.join(', ')}\n` +
    `📈 Nivel: ${nivel}\n` +
    `🗓️ Disponibilidad:\n${horario}\n\n` +
    `Ya te conozco 😎. Ahora mis consejos van dirigidos a *${especialidad}*.`
  );
}
