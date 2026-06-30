import { Telegraf } from 'telegraf';
import { config } from './config.js';
import { connectDB, disconnectDB } from './db.js';
import { logger } from './logger.js';
import { Profile } from './models/profile.js';
import { STATES } from './bot/states.js';
import { steps, resumenPerfil } from './bot/onboarding.js';
import {
  matchSkills,
  formatCVReport,
  recordScore,
  proyectarEscenarios,
  formatProyeccion,
} from './bot/cv_matcher.js';
import { generatePlan } from './bot/planner.js';
import { generarGraficaProgreso } from './bot/progreso.js';
import { startScheduler } from './bot/scheduler.js';
import { cvSteps, generarCV } from './bot/cv_generator.js';
import { scraperSkills, scraperScrape, scraperBecas } from './bot/scraper_client.js';

const bot = new Telegraf(config.botToken);

/**
 * Rate limiting simple en memoria: evita que un usuario spamee comandos pesados
 * (sobre todo /plan, que consume cuota de Groq). Se reinicia al reiniciar el bot.
 */
const lastCommand = new Map();

function isRateLimited(telegramId, comando, segundos) {
  const key = `${telegramId}:${comando}`;
  const last = lastCommand.get(key) || 0;
  if (Date.now() - last < segundos * 1000) return true;
  lastCommand.set(key, Date.now());
  return false;
}

/**
 * Migración suave: los perfiles viejos no tienen `especialidad`. Cuando usan un
 * comando que la necesita, los pone a elegirla (sin reiniciar todo el onboarding)
 * y devuelve false para que el comando aborte. El usuario re-ejecuta el comando
 * después de elegir. Devuelve true si el perfil ya tiene especialidad.
 */
async function requireEspecialidad(ctx, profile) {
  if (profile.especialidad) return true;
  profile.conversationState = STATES.EDIT_ESPECIALIDAD;
  await profile.save();
  await ctx.reply(
    'Antes de seguir necesito saber tu especialidad 🎯\n\n' +
      steps[STATES.EDIT_ESPECIALIDAD].prompt(profile) +
      '\n\n_(Después vuelve a escribir el comando que querías)_',
    { parse_mode: 'Markdown' }
  );
  return false;
}

/**
 * Busca el perfil del usuario o lo crea si es nuevo.
 */
async function getOrCreateProfile(ctx) {
  const telegramId = ctx.from.id;
  let profile = await Profile.findOne({ telegramId });
  if (!profile) {
    profile = await Profile.create({
      telegramId,
      username: ctx.from.username,
      conversationState: STATES.NEW,
    });
  }
  return profile;
}

/**
 * Mueve la conversacion a un nuevo estado y envia el prompt correspondiente.
 */
async function transitionTo(ctx, profile, nextState) {
  profile.conversationState = nextState;

  if (nextState === STATES.DONE) {
    profile.onboardingCompleto = true;
    await profile.save();
    await ctx.reply(resumenPerfil(profile));
    return;
  }

  await profile.save();
  const step = steps[nextState];
  if (step) {
    await ctx.reply(step.prompt(profile));
  }
}

// /start — inicia (o reinicia) el onboarding
bot.start(async (ctx) => {
  const profile = await getOrCreateProfile(ctx);
  await ctx.reply(
    'Voy a hacerte unas preguntas rápidas para conocerte. ' +
      'Puedes reiniciar en cualquier momento con /start.'
  );
  await transitionTo(ctx, profile, STATES.ASK_NOMBRE);
});

// /mercado — muestra las top skills del mercado para la carrera del usuario
bot.command('mercado', async (ctx) => {
  const profile = await Profile.findOne({ telegramId: ctx.from.id });
  if (!profile?.onboardingCompleto) {
    return ctx.reply('Primero completa tu perfil con /start 🙂');
  }
  if (isRateLimited(ctx.from.id, 'mercado', 30)) {
    return ctx.reply('Espera unos segundos antes de volver a consultar el mercado ⏳');
  }
  if (!(await requireEspecialidad(ctx, profile))) return;

  await ctx.sendChatAction('typing');
  await ctx.reply('🔍 Buscando el mercado laboral de tu especialidad...');

  try {
    // Primero dispara el scrape para que haya datos
    const scrapeRes = await scraperScrape(profile.especialidad);

    if (!scrapeRes.ok) throw new Error(`Scraper respondió ${scrapeRes.status}`);

    // Luego pide el ranking
    const res = await scraperSkills(profile.especialidad, 5);
    const data = await res.json();

    if (!res.ok || !data.skills?.length) {
      return ctx.reply('No encontré datos del mercado para tu especialidad. Intenta más tarde.');
    }

    const lista = data.skills
      .map((s, i) => `${i + 1}. ${s.skill} — pedida en el ${s.pct}% de vacantes`)
      .join('\n');

    await ctx.reply(
      `📊 Top 5 skills más pedidas en tu especialidad\n` +
        `_(basado en ${data.total_jobs} vacantes en OCC)_\n\n` +
        lista +
        '\n\nUsa /miCV para ver cuántas ya tienes ✅',
      { parse_mode: 'Markdown' }
    );
  } catch (err) {
    logger.error({ err: err.message, telegramId: ctx.from.id }, 'Error en /mercado');
    await ctx.reply('Hubo un error al consultar el mercado. ¿Está corriendo el scraper?');
  }
});

// /plan — genera plan de estudios de 8 semanas con Groq (Llama 3.3 70B)
bot.command('plan', async (ctx) => {
  const profile = await Profile.findOne({ telegramId: ctx.from.id });
  if (!profile?.onboardingCompleto) {
    return ctx.reply('Primero completa tu perfil con /start 🙂');
  }
  if (isRateLimited(ctx.from.id, 'plan', 60)) {
    return ctx.reply('Espera un momento antes de pedir otro plan ⏳');
  }
  if (!(await requireEspecialidad(ctx, profile))) return;

  await ctx.reply('🤖 Generando tu plan de estudios personalizado con IA...');

  try {
    // Obtiene las brechas actuales del mercado de su especialidad
    const res = await scraperSkills(profile.especialidad, 10);
    if (!res.ok) {
      return ctx.reply('Usa /mercado primero para obtener datos del mercado.');
    }
    const data = await res.json();
    const { missing } = matchSkills(profile.habilidades, data.skills);

    if (missing.length === 0) {
      return ctx.reply('¡Ya tienes todas las skills del mercado! Usa /mercado para actualizar el ranking.');
    }

    // Telegram solo muestra "escribiendo..." ~5s; lo renovamos mientras Groq responde
    await ctx.sendChatAction('typing');
    const typing = setInterval(() => ctx.sendChatAction('typing').catch(() => {}), 4000);

    let plan;
    try {
      plan = await generatePlan(profile, missing);
    } finally {
      clearInterval(typing);
    }

    // Telegram tiene limite de 4096 chars por mensaje
    if (plan.length <= 4096) {
      await ctx.reply(plan);
    } else {
      // Parte el plan en dos mensajes si es muy largo
      const mitad = plan.lastIndexOf('\n', 2000);
      await ctx.reply(plan.slice(0, mitad));
      await ctx.reply(plan.slice(mitad + 1));
    }
  } catch (err) {
    logger.error({ err: err.message, telegramId: ctx.from.id }, 'Error en /plan');
    await ctx.reply('Hubo un error al generar el plan. Verifica que GROQ_API_KEY esté configurado.');
  }
});

// /progreso — grafica ASCII de evolucion del score CV
bot.command('progreso', async (ctx) => {
  const profile = await Profile.findOne({ telegramId: ctx.from.id });
  if (!profile?.onboardingCompleto) {
    return ctx.reply('Primero completa tu perfil con /start 🙂');
  }
  const grafica = generarGraficaProgreso(profile.cvScores, profile.especialidad);
  await ctx.reply(grafica, { parse_mode: 'Markdown' });
});

// Respuestas al check-in semanal (botones inline)
bot.action('checkin_si', async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.editMessageText(
    '¡Excelente! 🔥 Cada semana completada te acerca más a tu meta.\n\n' +
    'Usa /plan para ver tu tarea de la próxima semana.'
  );
});

bot.action('checkin_no', async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.editMessageText(
    '¡No pasa nada! 💪 Los mejores también tienen semanas difíciles.\n\n' +
    'Intenta retomar esta semana. Usa /plan para ver tu lección pendiente.'
  );
});

// /becas — convocatorias filtradas por carrera con fecha limite
bot.command('becas', async (ctx) => {
  const profile = await Profile.findOne({ telegramId: ctx.from.id });
  if (!profile?.onboardingCompleto) {
    return ctx.reply('Primero completa tu perfil con /start 🙂');
  }

  await ctx.reply('🔍 Buscando becas para tu perfil...');

  try {
    const res = await scraperBecas(profile.especialidad, profile.carrera, 5);
    const data = await res.json();

    if (!res.ok || !data.becas?.length) {
      return ctx.reply('No encontré becas para tu perfil en este momento.');
    }

    const lista = data.becas.map((b) => {
      const urgencia = b.dias_restantes <= 14
        ? '🔴'
        : b.dias_restantes <= 30
        ? '🟡'
        : '🟢';
      return (
        `${urgencia} *${b.nombre}*\n` +
        `🏛️ ${b.institucion}\n` +
        `💰 ${b.monto}\n` +
        `📅 Cierra: ${b.fecha_limite} _(${b.dias_restantes} días)_\n` +
        `🔗 ${b.url}`
      );
    }).join('\n\n─────────────\n\n');

    await ctx.reply(
      `🎓 *Becas disponibles para ${profile.carrera}*\n\n${lista}`,
      { parse_mode: 'Markdown', disable_web_page_preview: true }
    );
  } catch (err) {
    logger.error({ err: err.message, telegramId: ctx.from.id }, 'Error en /becas');
    await ctx.reply('Hubo un error al buscar becas. ¿Está corriendo el scraper?');
  }
});

// /miCV — diagnostico de compatibilidad del CV contra el mercado.
// Registramos ambas grafías: Telegram hace match sensible a mayúsculas y el menú
// de BotFather obliga minúsculas (/micv), así que sin esto el botón del menú falla.
bot.command(['micv', 'miCV'], async (ctx) => {
  const profile = await Profile.findOne({ telegramId: ctx.from.id });
  if (!profile?.onboardingCompleto) {
    return ctx.reply('Primero completa tu perfil con /start 🙂');
  }
  if (isRateLimited(ctx.from.id, 'miCV', 30)) {
    return ctx.reply('Espera unos segundos antes de volver a analizar tu CV ⏳');
  }
  if (!(await requireEspecialidad(ctx, profile))) return;

  await ctx.sendChatAction('typing');
  await ctx.reply('🔍 Analizando tu CV contra el mercado de tu especialidad...');

  try {
    const res = await scraperSkills(profile.especialidad, 10);

    if (!res.ok) {
      return ctx.reply('No hay datos del mercado aún. Usa /mercado primero.');
    }

    const data = await res.json();
    if (!data.skills?.length) {
      return ctx.reply('No hay datos del mercado aún. Usa /mercado primero.');
    }

    const { score, have, missing } = matchSkills(profile.habilidades, data.skills);

    // Guarda snapshot historico (1 por mes y especialidad) para /progreso
    recordScore(profile, score, profile.especialidad);
    await profile.save();

    await ctx.reply(formatCVReport(profile.carrera, score, have, missing), {
      parse_mode: 'Markdown',
    });
  } catch (err) {
    logger.error({ err: err.message, telegramId: ctx.from.id }, 'Error en /miCV');
    await ctx.reply('Hubo un error al analizar tu CV. Intenta más tarde.');
  }
});

// /simular — "forecasted self": proyecta tu score si aprendes lo que más falta
bot.command(['simular', 'futuro'], async (ctx) => {
  const profile = await Profile.findOne({ telegramId: ctx.from.id });
  if (!profile?.onboardingCompleto) {
    return ctx.reply('Primero completa tu perfil con /start 🙂');
  }
  if (isRateLimited(ctx.from.id, 'simular', 20)) {
    return ctx.reply('Espera unos segundos antes de volver a simular ⏳');
  }
  if (!(await requireEspecialidad(ctx, profile))) return;

  await ctx.sendChatAction('typing');
  try {
    const res = await scraperSkills(profile.especialidad, 10);
    if (!res.ok) {
      return ctx.reply('No hay datos del mercado aún. Usa /mercado primero.');
    }
    const data = await res.json();
    if (!data.skills?.length) {
      return ctx.reply('No hay datos del mercado aún. Usa /mercado primero.');
    }

    const proy = proyectarEscenarios(profile.habilidades, data.skills, 3);
    await ctx.reply(formatProyeccion(proy), { parse_mode: 'Markdown' });
  } catch (err) {
    logger.error({ err: err.message, telegramId: ctx.from.id }, 'Error en /simular');
    await ctx.reply('Hubo un error al simular tu progreso. Intenta más tarde.');
  }
});

// /perfil — muestra lo que el bot sabe de ti
bot.command('perfil', async (ctx) => {
  const profile = await Profile.findOne({ telegramId: ctx.from.id });
  if (!profile || !profile.onboardingCompleto) {
    return ctx.reply('Aún no completas tu perfil. Escribe /start para empezar 🙂');
  }
  await ctx.reply(resumenPerfil(profile));
});

/**
 * Pone al perfil en un estado de edición puntual y le envía el prompt.
 * Al responder, el handler de texto procesa el dato y vuelve a DONE.
 */
async function startEdit(ctx, editState) {
  const profile = await Profile.findOne({ telegramId: ctx.from.id });
  if (!profile?.onboardingCompleto) {
    return ctx.reply('Primero completa tu perfil con /start 🙂');
  }
  profile.conversationState = editState;
  await profile.save();
  await ctx.reply(steps[editState].prompt(profile));
}

// /habilidades — edita solo las habilidades sin rehacer el onboarding
bot.command('habilidades', (ctx) => startEdit(ctx, STATES.EDIT_HABILIDADES));

// /horario — edita solo la disponibilidad sin rehacer el onboarding
bot.command('horario', (ctx) => startEdit(ctx, STATES.EDIT_HORARIO));

// /especialidad — cambia el rumbo (recalcula mercado, CV, plan y becas)
bot.command('especialidad', (ctx) => startEdit(ctx, STATES.EDIT_ESPECIALIDAD));

// /cv — genera un CV estilo Harvard en PDF tras un mini-flujo de 4 preguntas
bot.command('cv', async (ctx) => {
  const profile = await Profile.findOne({ telegramId: ctx.from.id });
  if (!profile?.onboardingCompleto) {
    return ctx.reply('Primero completa tu perfil con /start 🙂');
  }
  profile.conversationState = STATES.CV_ASK_PROYECTOS;
  await profile.save();
  await ctx.reply(cvSteps[STATES.CV_ASK_PROYECTOS].prompt(profile), { parse_mode: 'Markdown' });
});

/**
 * Estructura el contenido con Groq y envía el PDF del CV a Telegram.
 */
async function generarYEnviarCV(ctx, profile) {
  await ctx.reply('🛠️ Armando tu CV estilo Harvard en PDF... (unos segundos)');
  await ctx.sendChatAction('upload_document');
  try {
    const { buffer, filename } = await generarCV(profile);
    await ctx.replyWithDocument(
      { source: buffer, filename },
      { caption: '📄 ¡Listo! Tu CV estilo Harvard. Revísalo y ajústalo si hace falta 😉' }
    );
  } catch (err) {
    logger.error({ err: err.message, telegramId: ctx.from.id }, 'Error generando CV');
    await ctx.reply('Hubo un error al generar tu CV. Intenta de nuevo en un momento.');
  }
}

// Mensajes de texto — avanzan la maquina de estados
bot.on('text', async (ctx) => {
  const profile = await getOrCreateProfile(ctx);
  const state = profile.conversationState;

  // Si no esta en medio del onboarding, guialo
  if (state === STATES.NEW || state === STATES.DONE) {
    return ctx.reply('Escribe /start para (re)hacer tu perfil o /perfil para verlo 🙂');
  }

  // El mini-flujo de /cv usa su propio registro de pasos (cvSteps)
  const step = cvSteps[state] || steps[state];
  if (!step) {
    // Estado desconocido: reinicia por seguridad
    return transitionTo(ctx, profile, STATES.ASK_NOMBRE);
  }

  const result = step.handle(ctx.message.text, profile);
  if (!result.ok) {
    await profile.save(); // por si el handle dejo algo a medias
    return ctx.reply(result.error);
  }

  // Fin del flujo /cv: vuelve a DONE y genera el PDF
  if (result.generateCV) {
    profile.conversationState = STATES.DONE;
    await profile.save();
    return generarYEnviarCV(ctx, profile);
  }

  await transitionTo(ctx, profile, result.next);
});

// Manejo basico de errores para no tumbar el proceso
bot.catch((err, ctx) => {
  logger.error({ err, telegramId: ctx?.from?.id }, 'Error procesando update');
});

process.on('unhandledRejection', (reason) => {
  logger.error({ reason: reason?.message ?? reason }, 'Unhandled rejection');
});

async function main() {
  await connectDB();
  logger.info('Lanzando bot...');
  try {
    await bot.launch();
    startScheduler(bot);
    logger.info('🤖 Bot en marcha. Habla con él en Telegram.');
  } catch (err) {
    logger.error({ err: err?.message ?? err }, 'Error en bot.launch()');
    process.exit(1);
  }
}

process.once('SIGINT', async () => {
  bot.stop('SIGINT');
  await disconnectDB();
});
process.once('SIGTERM', async () => {
  bot.stop('SIGTERM');
  await disconnectDB();
});

main();
