import 'dotenv/config';

/**
 * Carga y valida la configuracion desde variables de entorno.
 * Falla rapido si falta algo critico, para no arrancar el bot a medias.
 */
function required(name) {
  const value = process.env[name];
  if (!value) {
    console.error(`❌ Falta la variable de entorno: ${name}`);
    console.error('   Copia .env.example a .env y completa los valores.');
    process.exit(1);
  }
  return value;
}

export const config = {
  botToken: required('BOT_TOKEN'),
  mongoUri: required('MONGODB_URI'),
  geminiKey: process.env.GEMINI_API_KEY || '',
  groqKey: process.env.GROQ_API_KEY || '',
  env: process.env.NODE_ENV || 'development',
  scraperUrl: process.env.SCRAPER_URL || 'http://localhost:5001',
  // Secreto compartido Node<->Flask. Si está vacío, la auth queda desactivada
  // (cómodo en local); en producción ponlo en ambos .env.
  apiSecret: process.env.API_SECRET_KEY || '',
};
