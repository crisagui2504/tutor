/**
 * Estados de la maquina de conversacion (el "formulario invisible").
 *
 * Cada mensaje del usuario hace avanzar al siguiente estado. El estado actual
 * vive en `profile.conversationState` en MongoDB.
 *
 * Flujo del onboarding:
 *   NEW -> ASK_NOMBRE -> ASK_CARRERA -> ASK_SEMESTRE -> ASK_PROMEDIO
 *       -> ASK_HABILIDADES -> ASK_HORARIO -> DONE
 */
export const STATES = {
  NEW: 'NEW',                     // recien creado, aun no empieza
  ASK_NOMBRE: 'ASK_NOMBRE',
  ASK_CARRERA: 'ASK_CARRERA',
  ASK_ESPECIALIDAD: 'ASK_ESPECIALIDAD', // hacia donde va (dirige todo el bot)
  ASK_OBJETIVO: 'ASK_OBJETIVO',         // tipo de empresa (opcional)
  ASK_SEMESTRE: 'ASK_SEMESTRE',
  ASK_PROMEDIO: 'ASK_PROMEDIO',
  ASK_HABILIDADES: 'ASK_HABILIDADES',
  ASK_NIVEL: 'ASK_NIVEL',               // nivel autopercibido (3 puntos)
  ASK_HORARIO: 'ASK_HORARIO',
  DONE: 'DONE',                   // onboarding terminado

  // Edicion puntual (post-onboarding): editan un solo campo y vuelven a DONE
  // sin re-preguntar todo. Los activan los comandos /habilidades, /horario, /especialidad.
  EDIT_HABILIDADES: 'EDIT_HABILIDADES',
  EDIT_HORARIO: 'EDIT_HORARIO',
  EDIT_ESPECIALIDAD: 'EDIT_ESPECIALIDAD',

  // Mini-flujo del comando /cv (independiente del onboarding). Al terminar
  // genera el PDF en vez de volver al menú.
  CV_ASK_PROYECTOS: 'CV_ASK_PROYECTOS',
  CV_ASK_LOGROS: 'CV_ASK_LOGROS',
  CV_ASK_LINKS: 'CV_ASK_LINKS',
  CV_ASK_EMAIL: 'CV_ASK_EMAIL',
};
