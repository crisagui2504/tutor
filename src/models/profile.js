import mongoose from 'mongoose';
import { STATES } from '../bot/states.js';

/**
 * Perfil del estudiante.
 *
 * Guarda tanto los datos del onboarding como el estado de la conversacion
 * (`conversationState`). Persistir el estado en la base — en vez de en memoria —
 * hace que el bot sobreviva reinicios/redeploys en Railway sin perder el hilo.
 */
const profileSchema = new mongoose.Schema(
  {
    // Identidad de Telegram (clave unica del usuario)
    telegramId: { type: Number, required: true, unique: true, index: true },
    username: { type: String },

    // Datos del onboarding
    nombre: { type: String },
    carrera: { type: String },

    // Capa de precisión: especialidad dirige mercado/CV/plan/becas.
    // `especialidad` es requerida tras el onboarding; los perfiles viejos no la
    // tienen y se migran en caliente (ver requireEspecialidad en index.js).
    especialidad: { type: String },
    objetivo: { type: String },   // tipo de empresa (opcional)
    nivel: { type: String },      // autopercibido: principiante|intermedio|avanzado

    semestre: { type: Number },
    promedio: { type: Number },
    habilidades: { type: [String], default: [] },

    // Gamificación (puntos + racha semanal)
    puntos: { type: Number, default: 0 },
    racha: { type: Number, default: 0 },
    ultimaActividad: { type: Date },

    // Datos extra para el CV (los pregunta /cv, no el onboarding)
    email: { type: String },
    github: { type: String },
    linkedin: { type: String },
    proyectos: { type: [String], default: [] },
    logros: { type: [String], default: [] },

    // Horario disponible por dia (ej. { lunes: "19:00-21:00", sabado: "09:00-13:00" })
    horario: { type: Map, of: String, default: {} },

    // Maquina de estados de la conversacion
    conversationState: {
      type: String,
      enum: Object.values(STATES),
      default: STATES.NEW,
    },

    // true cuando termino el onboarding completo
    onboardingCompleto: { type: Boolean, default: false },

    // Historial de scores de compatibilidad CV vs mercado (Fase 3 y 6).
    // Guarda contra qué especialidad se calculó: si cambias de especialidad,
    // /progreso filtra para no comparar peras con manzanas.
    cvScores: {
      type: [{ score: Number, fecha: Date, especialidad: String }],
      default: [],
    },
  },
  { timestamps: true } // createdAt + updatedAt automaticos
);

export const Profile = mongoose.model('Profile', profileSchema);
