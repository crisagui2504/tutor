import dns from 'dns';
import mongoose from 'mongoose';
import { config } from './config.js';
import { logger } from './logger.js';

// Fuerza a Node.js a usar Google DNS, por si el DNS local falla con SRV records
dns.setServers(['8.8.8.8', '8.8.4.4']);

/**
 * Conecta a MongoDB Atlas. Mongoose mantiene un pool de conexiones,
 * asi que se llama una sola vez al arrancar.
 */
export async function connectDB() {
  mongoose.set('strictQuery', true);
  await mongoose.connect(config.mongoUri);
  logger.info('✅ Conectado a MongoDB');
}

export async function disconnectDB() {
  await mongoose.disconnect();
  logger.info('🔌 Desconectado de MongoDB');
}
