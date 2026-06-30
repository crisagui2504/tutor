import { z } from 'zod';
import { config } from '../config.js';
import { STATES } from './states.js';
import { otorgarPuntos } from './gamificacion.js';
import { ESPECIALIDADES, NIVELES, labelDe } from './especialidades.js';

/**
 * Entrevista técnica simulada. Groq genera preguntas ABIERTAS por especialidad;
 * el usuario responde con texto libre y Groq evalúa cada respuesta (feedback +
 * puntuación 1-5). El estado vive en memoria (efímero) y la conversación se
 * enruta vía STATES.ENTREVISTA en el handler de texto.
 */
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

const entrevistas = new Map();

const PREGUNTAS_SCHEMA = z.object({
  preguntas: z.array(z.string().min(1)).min(1),
});
const EVAL_SCHEMA = z.object({
  feedback: z.string().min(1),
  puntuacion: z.number().int().min(1).max(5),
});

/**
 * Llama a Groq pidiendo JSON y lo parsea. Lanza si falla la red o el parseo.
 */
async function callGroqJSON(prompt, maxTokens = 800) {
  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.groqKey}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.6,
      max_tokens: maxTokens,
      response_format: { type: 'json_object' },
    }),
  });
  if (!res.ok) throw new Error(`Groq ${res.status}`);
  const data = await res.json();
  const raw = data.choices?.[0]?.message?.content ?? '';
  return JSON.parse(raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1));
}

async function generarPreguntas(profile) {
  const especialidad = labelDe(profile.especialidad, ESPECIALIDADES);
  const nivel = profile.nivel ? labelDe(profile.nivel, NIVELES) : 'principiante';
  const prompt = `Eres entrevistador técnico de ${especialidad} en México. Genera 3 preguntas de entrevista ABIERTAS (no de opción múltiple) para un candidato nivel ${nivel}, que evalúen conocimiento práctico real.

Devuelve SOLO JSON: { "preguntas": ["...", "...", "..."] }
En español, preguntas concretas y realistas de una entrevista.`;

  const json = await callGroqJSON(prompt, 700);
  const parsed = PREGUNTAS_SCHEMA.safeParse(json);
  if (!parsed.success) throw new Error('Preguntas inválidas');
  return parsed.data.preguntas.slice(0, 3);
}

async function evaluarConGroq(profile, pregunta, respuesta) {
  const especialidad = labelDe(profile.especialidad, ESPECIALIDADES);
  const prompt = `Eres entrevistador técnico de ${especialidad}. Evalúa la respuesta del candidato de forma constructiva.

Pregunta: ${pregunta}
Respuesta del candidato: ${respuesta}

Devuelve SOLO JSON: { "feedback": "2-3 frases: qué estuvo bien y qué mejorar", "puntuacion": <entero 1-5> }
Sé específico y alentador. En español.`;

  const json = await callGroqJSON(prompt, 500);
  const parsed = EVAL_SCHEMA.safeParse(json);
  if (!parsed.success) throw new Error('Evaluación inválida');
  return parsed.data;
}

function enviarPregunta(ctx, estado) {
  const q = estado.preguntas[estado.actual];
  return ctx.reply(
    `🎤 Pregunta ${estado.actual + 1}/${estado.preguntas.length}\n\n${q}\n\n` +
      '(Responde con tu mejor respuesta, como en una entrevista real)'
  );
}

/**
 * Inicia la entrevista: genera preguntas, guarda estado, marca el conversation
 * state y envía la primera. Lanza si Groq falla (el caller avisa al usuario).
 */
export async function iniciarEntrevista(ctx, profile) {
  const preguntas = await generarPreguntas(profile);
  entrevistas.set(ctx.from.id, { preguntas, actual: 0, puntuaciones: [] });
  profile.conversationState = STATES.ENTREVISTA;
  await profile.save();
  await enviarPregunta(ctx, entrevistas.get(ctx.from.id));
}

/**
 * Procesa una respuesta de texto durante la entrevista: la evalúa, da feedback
 * y avanza; al terminar cierra, otorga puntos y vuelve a DONE.
 */
export async function responderEntrevista(ctx, profile, texto) {
  const estado = entrevistas.get(ctx.from.id);
  if (!estado) {
    // Estado perdido (p.ej. reinicio del bot): saca al usuario del modo entrevista
    profile.conversationState = STATES.DONE;
    await profile.save();
    return ctx.reply('La entrevista expiró 🙂 Usa /entrevista para empezar otra.');
  }

  await ctx.sendChatAction('typing');
  const pregunta = estado.preguntas[estado.actual];

  let evaluacion;
  try {
    evaluacion = await evaluarConGroq(profile, pregunta, texto);
  } catch {
    evaluacion = { feedback: 'No pude evaluar esta respuesta, pero ¡buen intento!', puntuacion: 3 };
  }
  estado.puntuaciones.push(evaluacion.puntuacion);
  await ctx.reply(`📝 ${'⭐'.repeat(evaluacion.puntuacion)}\n${evaluacion.feedback}`);

  estado.actual++;
  if (estado.actual < estado.preguntas.length) {
    return enviarPregunta(ctx, estado);
  }

  // Fin de la entrevista
  const total = estado.puntuaciones.length;
  const prom = Math.round((estado.puntuaciones.reduce((a, b) => a + b, 0) / total) * 10) / 10;
  entrevistas.delete(ctx.from.id);
  profile.conversationState = STATES.DONE;

  const ganados = Math.round(prom * 10); // hasta 50 pts
  const r = otorgarPuntos(profile, ganados);
  await profile.save();

  await ctx.reply(
    `🎤 *Entrevista terminada*\nPromedio: *${prom}/5* ⭐\n` +
      `⭐ +${ganados} puntos (total: ${r.total})` +
      (r.subioNivel ? `\n🎉 ¡Subiste al nivel ${r.nivel}!` : '') +
      '\n\nUsa /cv para tu CV o /plan para seguir preparándote.',
    { parse_mode: 'Markdown' }
  );
}
