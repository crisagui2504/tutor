import { config } from '../config.js';
import {
  ESPECIALIDADES,
  NIVELES,
  OBJETIVOS,
  PLATAFORMAS,
  labelDe,
} from './especialidades.js';

function formatHorario(horario) {
  return [...horario.entries()]
    .map(([dia, rango]) => {
      const [inicio, fin] = rango.split('-');
      return `${dia} de ${inicio} a ${fin}`;
    })
    .join(', ');
}

// Groq: inferencia LLM en la nube (rápida y gratuita), API compatible con OpenAI
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

export async function generatePlan(profile, missing) {
  const horarioTexto = formatHorario(profile.horario);
  const skillsTexto = missing.slice(0, 5).join(', ');

  // Contexto de especialidad: dirige los recursos que recomienda Groq
  const especialidadLabel = profile.especialidad
    ? labelDe(profile.especialidad, ESPECIALIDADES)
    : 'desarrollo de software general';
  const plataformas =
    PLATAFORMAS[profile.especialidad] ||
    'freeCodeCamp, The Odin Project, CS50, YouTube, docs oficiales';
  const nivelLabel = profile.nivel ? labelDe(profile.nivel, NIVELES) : 'no especificado';
  const objetivoLabel = profile.objetivo ? labelDe(profile.objetivo, OBJETIVOS) : 'no especificado';

  const prompt = `Eres un coach de carreras tech para el mercado mexicano, experto en ${especialidadLabel}.

Estudiante:
- Nombre: ${profile.nombre}
- Carrera: ${profile.carrera}, semestre ${profile.semestre}
- Especialidad objetivo: ${especialidadLabel}
- Nivel actual: ${nivelLabel}
- Dónde quiere trabajar: ${objetivoLabel}
- Habilidades actuales: ${profile.habilidades.join(', ')}
- Necesita aprender: ${skillsTexto}
- Disponibilidad: ${horarioTexto}

Genera un plan de estudios de 8 semanas ESPECÍFICO para ${especialidadLabel}, con recursos GRATUITOS y reales de esa área (prioriza: ${plataformas}).
Ajusta la dificultad al nivel ${nivelLabel}. No recomiendes recursos genéricos si hay uno mejor para la especialidad.

Formato EXACTO (sin introducción, empieza directo):

PLAN DE 8 SEMANAS — ${profile.nombre}

SEMANA 1: [skill]
Objetivo: [qué sabrá hacer]
Recurso: [recurso gratuito específico]
Horas: [horas según su disponibilidad]

SEMANA 2: [skill]
Objetivo: [...]
Recurso: [...]
Horas: [...]

[continúa hasta semana 8]

CONSEJO FINAL: [1-2 oraciones motivadoras]`;

  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.groqKey}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 1500,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Groq error: ${err}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? 'No se pudo generar el plan.';
}
