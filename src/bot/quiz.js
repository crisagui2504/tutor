import { Markup } from 'telegraf';
import { z } from 'zod';
import { config } from '../config.js';
import { Profile } from '../models/profile.js';
import { otorgarPuntos } from './gamificacion.js';
import { ESPECIALIDADES, NIVELES, labelDe } from './especialidades.js';

const PUNTOS_POR_ACIERTO = 10;

/**
 * Quiz semanal interactivo. En vez de entregar el plan como un bloque grande de
 * texto, refuerza el aprendizaje con preguntas cortas de opción múltiple y
 * feedback inmediato (el patrón que el paper IJCRT asocia a ~90% de finalización).
 *
 * El estado del quiz en curso vive en memoria (Map por usuario): es efímero
 * (~1 min) y si el bot reinicia, el usuario simplemente hace /quiz de nuevo.
 */
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
const LETRAS = ['A', 'B', 'C', 'D'];

const quizzes = new Map();

const QUIZ_SCHEMA = z.object({
  preguntas: z
    .array(
      z.object({
        pregunta: z.string().min(1),
        opciones: z.array(z.string().min(1)).length(4),
        correcta: z.number().int().min(0).max(3),
        explicacion: z.string().default(''),
      })
    )
    .min(1),
});

/**
 * Genera un quiz con Groq sobre los temas dados. Lanza si Groq falla o el JSON
 * no cumple el esquema (el caller decide cómo avisar al usuario).
 *
 * @param {object} profile
 * @param {string[]} temas - skills sobre las que preguntar
 */
export async function generarQuiz(profile, temas) {
  const especialidad = profile.especialidad
    ? labelDe(profile.especialidad, ESPECIALIDADES)
    : 'tecnología';
  const nivel = profile.nivel ? labelDe(profile.nivel, NIVELES) : 'principiante';

  const prompt = `Eres instructor de ${especialidad}. Genera un quiz de 3 preguntas de opción múltiple (4 opciones cada una) para un estudiante nivel ${nivel}, para reforzar: ${temas.join(', ')}.

Devuelve SOLO JSON con esta forma exacta:
{ "preguntas": [ { "pregunta": "...", "opciones": ["a","b","c","d"], "correcta": 0, "explicacion": "1 frase corta" } ] }

Reglas: preguntas prácticas y concretas (no triviales), en español. "correcta" es el índice (0-3) de la opción correcta. Las 4 opciones plausibles.`;

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
      max_tokens: 1200,
      response_format: { type: 'json_object' },
    }),
  });
  if (!res.ok) throw new Error(`Groq ${res.status}`);

  const data = await res.json();
  const raw = data.choices?.[0]?.message?.content ?? '';
  const json = JSON.parse(raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1));

  const result = QUIZ_SCHEMA.safeParse(json);
  if (!result.success) {
    throw new Error(`Quiz inválido: ${result.error.issues[0]?.message}`);
  }
  return result.data;
}

/**
 * Renderiza la pregunta actual con botones A/B/C/D. Texto plano (sin Markdown)
 * para no romper el parser con asteriscos/guiones del contenido de Groq.
 */
function enviarPregunta(ctx, estado) {
  const q = estado.preguntas[estado.actual];
  const texto =
    `❓ Pregunta ${estado.actual + 1}/${estado.preguntas.length}\n\n` +
    `${q.pregunta}\n\n` +
    q.opciones.map((o, i) => `${LETRAS[i]}) ${o}`).join('\n');

  const botones = q.opciones.map((_, i) =>
    Markup.button.callback(LETRAS[i], `quiz:${estado.actual}:${i}`)
  );
  return ctx.reply(texto, Markup.inlineKeyboard(botones, { columns: 4 }));
}

/**
 * Inicia un quiz: genera, guarda el estado y envía la primera pregunta.
 */
export async function iniciarQuiz(ctx, profile, temas) {
  const quiz = await generarQuiz(profile, temas);
  quizzes.set(ctx.from.id, { ...quiz, actual: 0, aciertos: 0 });
  await enviarPregunta(ctx, quizzes.get(ctx.from.id));
}

/**
 * Maneja una respuesta (callback_query con data "quiz:<pregunta>:<opcion>").
 * Da feedback inmediato y avanza a la siguiente pregunta o cierra el quiz.
 */
export async function responderQuiz(ctx) {
  await ctx.answerCbQuery();
  const estado = quizzes.get(ctx.from.id);
  if (!estado) {
    return ctx.reply('Tu quiz expiró 🙂 Usa /quiz para uno nuevo.');
  }

  const qIndex = Number(ctx.match[1]);
  const elegido = Number(ctx.match[2]);
  if (qIndex !== estado.actual) return; // respuesta vieja o doble tap: ignora

  const q = estado.preguntas[qIndex];
  const correcto = elegido === q.correcta;
  if (correcto) estado.aciertos++;

  const feedback =
    `${q.pregunta}\n\n` +
    (correcto
      ? `✅ ¡Correcto! ${LETRAS[q.correcta]}) ${q.opciones[q.correcta]}`
      : `❌ Tu respuesta: ${LETRAS[elegido]}. La correcta era ${LETRAS[q.correcta]}) ${q.opciones[q.correcta]}`) +
    (q.explicacion ? `\n\n💡 ${q.explicacion}` : '');

  // Reemplaza la pregunta por el feedback (quita los botones)
  try {
    await ctx.editMessageText(feedback);
  } catch {
    await ctx.reply(feedback);
  }

  estado.actual++;
  if (estado.actual < estado.preguntas.length) {
    await enviarPregunta(ctx, estado);
  } else {
    const total = estado.preguntas.length;
    const aciertos = estado.aciertos;
    quizzes.delete(ctx.from.id);
    const animo =
      aciertos === total
        ? '¡Perfecto! 🔥'
        : aciertos >= total / 2
        ? '¡Bien! Vas por buen camino 💪'
        : 'Sigue practicando, lo vas a dominar 🌱';

    // Otorga puntos por aciertos (gamificación)
    let extra = '';
    const profile = await Profile.findOne({ telegramId: ctx.from.id });
    if (profile) {
      const ganados = aciertos * PUNTOS_POR_ACIERTO;
      const r = otorgarPuntos(profile, ganados);
      await profile.save();
      extra = `\n⭐ +${ganados} puntos (total: ${r.total})`;
      if (r.subioNivel) extra += `\n🎉 ¡Subiste al nivel ${r.nivel}!`;
    }

    await ctx.reply(
      `🎯 *Quiz terminado*\nAcertaste *${aciertos}/${total}*. ${animo}${extra}\n\n` +
        'Usa /plan para seguir tu plan o /puntos para ver tu progreso.',
      { parse_mode: 'Markdown' }
    );
  }
}
