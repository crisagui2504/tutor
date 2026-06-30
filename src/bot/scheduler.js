import cron from 'node-cron';
import { Markup } from 'telegraf';
import { Profile } from '../models/profile.js';
import { matchSkills, recordScore } from './cv_matcher.js';
import { scraperSkills } from './scraper_client.js';
import { logger } from '../logger.js';

/**
 * Envia el check-in semanal a todos los usuarios con onboarding completo.
 * Se llama automaticamente cada lunes a las 9 AM (hora Mexico).
 */
async function sendWeeklyCheckin(bot) {
  const usuarios = await Profile.find({ onboardingCompleto: true });
  logger.info({ usuarios: usuarios.length }, '⏰ Check-in semanal');

  for (const profile of usuarios) {
    try {
      await bot.telegram.sendMessage(
        profile.telegramId,
        `¡Buenos días, ${profile.nombre}! 👋\n\n` +
          '¿Completaste tu lección de esta semana según tu plan de estudios?',
        Markup.inlineKeyboard([
          Markup.button.callback('✅ Sí, la completé', 'checkin_si'),
          Markup.button.callback('😅 No pude esta semana', 'checkin_no'),
        ])
      );
    } catch (err) {
      logger.error({ err: err.message, telegramId: profile.telegramId }, 'No se pudo enviar check-in');
    }
  }
}

/**
 * Re-calcula el score CV vs mercado de todos los usuarios.
 * Se ejecuta el dia 1 de cada mes a las 10 AM.
 */
async function monthlyRescore(bot) {
  const usuarios = await Profile.find({ onboardingCompleto: true });
  logger.info({ usuarios: usuarios.length }, '📊 Re-score mensual');

  for (const profile of usuarios) {
    try {
      // Los perfiles viejos sin especialidad se saltan (se migran al usar el bot)
      if (!profile.especialidad) continue;

      const res = await scraperSkills(profile.especialidad, 10);
      if (!res.ok) continue;

      const data = await res.json();
      if (!data.skills?.length) continue;

      const { score } = matchSkills(profile.habilidades, data.skills);

      // Captura el score previo ANTES de registrar el nuevo (recordScore puede
      // actualizar la entrada del mes en curso en vez de agregar una nueva)
      const anterior = profile.cvScores.at(-1)?.score ?? 0;
      recordScore(profile, score, profile.especialidad);
      await profile.save();

      // Notifica al usuario si su score subio
      if (score > anterior) {
        await bot.telegram.sendMessage(
          profile.telegramId,
          `📈 *Tu compatibilidad subió a ${score}%* (+${score - anterior}% este mes)\n\n` +
            'Sigue así, cada skill que aprendes te acerca más a tu trabajo ideal.\n' +
            'Usa /progreso para ver tu evolución.',
          { parse_mode: 'Markdown' }
        );
      }
    } catch (err) {
      logger.error({ err: err.message, telegramId: profile.telegramId }, 'Re-score falló');
    }
  }
}

/**
 * Inicia todos los cron jobs. Llamar una vez al arrancar el bot.
 * @param {import('telegraf').Telegraf} bot
 */
export function startScheduler(bot) {
  // Lunes a las 9:00 AM hora Mexico
  cron.schedule('0 9 * * 1', () => sendWeeklyCheckin(bot), {
    timezone: 'America/Mexico_City',
  });

  // Dia 1 de cada mes a las 10:00 AM
  cron.schedule('0 10 1 * *', () => monthlyRescore(bot), {
    timezone: 'America/Mexico_City',
  });

  logger.info('⏰ Scheduler iniciado (check-in lunes 9am, re-score dia 1 cada mes)');
}
