import pino from 'pino';

/**
 * Logger estructurado para toda la app.
 *
 * - En desarrollo: salida bonita y coloreada (pino-pretty) para leer en consola.
 * - En producción: JSON puro, que Railway/Logtail pueden indexar y filtrar.
 *
 * Nivel configurable con LOG_LEVEL (default: info).
 */
const isDev = (process.env.NODE_ENV || 'development') !== 'production';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: isDev
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss',
          ignore: 'pid,hostname',
        },
      }
    : undefined,
});
