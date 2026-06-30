import PDFDocument from 'pdfkit';
import { config } from '../config.js';
import { logger } from '../logger.js';
import { STATES } from './states.js';
import { ESPECIALIDADES, NIVELES, labelDe } from './especialidades.js';

/**
 * Generador de CV estilo Harvard.
 *
 * Responsabilidad separada de cv_matcher.js: el matcher COMPARA skills contra el
 * mercado; este arma el DOCUMENTO. El comando /cv corre un mini-flujo de 4
 * preguntas (estados CV_*) y al final estructura el contenido con Groq y lo
 * renderiza a PDF con PDFKit (Times-Roman, una columna, estilo Harvard).
 */

// ---------------------------------------------------------------------------
// Mini-flujo de preguntas (estados CV_*). El último paso marca generateCV.
// ---------------------------------------------------------------------------

const SKIP = new Set(['0', '-', 'no', 'ninguno', 'ninguna', 'saltar', 'skip']);

function splitLineas(text) {
  return text
    .split(/[\n;]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export const cvSteps = {
  [STATES.CV_ASK_PROYECTOS]: {
    prompt: () =>
      '📄 Vamos a armar tu CV estilo Harvard.\n\n' +
      '*1/4* — ¿Qué proyectos o experiencia tienes? (aunque sean pequeños)\n' +
      'Uno por línea o separados por *;*. Escribe *0* para saltar.\n\n' +
      'Ej: App de tareas en React; Servicio social en sistemas de la escuela',
    handle: (text, profile) => {
      const limpio = text.trim().toLowerCase();
      profile.proyectos = SKIP.has(limpio) ? [] : splitLineas(text);
      return { ok: true, next: STATES.CV_ASK_LOGROS };
    },
  },

  [STATES.CV_ASK_LOGROS]: {
    prompt: () =>
      '*2/4* — ¿Tienes logros o reconocimientos? (becas, concursos, certificados)\n' +
      'Uno por línea o separados por *;*. Escribe *0* para saltar.',
    handle: (text, profile) => {
      const limpio = text.trim().toLowerCase();
      profile.logros = SKIP.has(limpio) ? [] : splitLineas(text);
      return { ok: true, next: STATES.CV_ASK_LINKS };
    },
  },

  [STATES.CV_ASK_LINKS]: {
    prompt: () =>
      '*3/4* — ¿Tienes GitHub o LinkedIn? Pega los links (o *0* para saltar).\n\n' +
      'Ej: github.com/tuusuario, linkedin.com/in/tuusuario',
    handle: (text, profile) => {
      const limpio = text.trim().toLowerCase();
      if (!SKIP.has(limpio)) {
        const { github, linkedin } = parseLinks(text);
        if (github) profile.github = github;
        if (linkedin) profile.linkedin = linkedin;
      }
      return { ok: true, next: STATES.CV_ASK_EMAIL };
    },
  },

  [STATES.CV_ASK_EMAIL]: {
    prompt: () =>
      '*4/4* — ¿Cuál es tu email de contacto? (o *0* para saltar)',
    handle: (text, profile) => {
      const limpio = text.trim();
      if (SKIP.has(limpio.toLowerCase())) {
        return { ok: true, generateCV: true };
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(limpio)) {
        return { ok: false, error: 'Ese email no se ve válido. Escríbelo bien o *0* para saltar 📧' };
      }
      profile.email = limpio;
      return { ok: true, generateCV: true };
    },
  },
};

/**
 * Extrae URLs de GitHub y LinkedIn de texto libre.
 */
function parseLinks(text) {
  const result = {};
  for (const token of text.split(/[\s,]+/)) {
    const t = token.trim().replace(/^https?:\/\//, '');
    if (/github\.com/i.test(t)) result.github = t;
    else if (/linkedin\.com/i.test(t)) result.linkedin = t;
  }
  return result;
}

// ---------------------------------------------------------------------------
// Estructuración del contenido (Groq + fallback determinista)
// ---------------------------------------------------------------------------

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

// Categorización de skills para el fallback (cuando Groq no responde)
const CATEGORIAS = {
  Lenguajes: ['javascript', 'typescript', 'python', 'java', 'c#', 'c++', 'php', 'go', 'ruby', 'kotlin', 'swift', 'rust', 'bash', 'r'],
  Frameworks: ['react', 'angular', 'vue', 'next.js', 'node.js', 'express', 'django', 'flask', 'fastapi', 'spring boot', 'laravel', '.net', 'nestjs', 'tensorflow', 'pytorch', 'pandas', 'numpy', 'scikit-learn'],
  'Bases de datos': ['sql', 'mysql', 'postgresql', 'mongodb', 'redis', 'oracle', 'sql server'],
  'Cloud y herramientas': ['aws', 'azure', 'gcp', 'docker', 'kubernetes', 'git', 'github', 'terraform', 'ci/cd', 'jenkins', 'linux', 'power bi', 'tableau', 'cisco', 'wireshark'],
};

/**
 * Categoriza skills con el mapa local (fallback sin IA).
 */
function categorizarLocal(habilidades) {
  const cats = { Lenguajes: [], Frameworks: [], 'Bases de datos': [], 'Cloud y herramientas': [], Otras: [] };
  for (const skill of habilidades) {
    const lower = skill.toLowerCase();
    if (/ingl|franc|alem|portug|español/.test(lower)) continue; // idiomas van aparte
    let ubicada = false;
    for (const [cat, lista] of Object.entries(CATEGORIAS)) {
      if (lista.includes(lower)) {
        cats[cat].push(skill);
        ubicada = true;
        break;
      }
    }
    if (!ubicada) cats.Otras.push(skill);
  }
  // Quita categorías vacías
  return Object.fromEntries(Object.entries(cats).filter(([, v]) => v.length));
}

/**
 * Estructura los datos del perfil en secciones de CV. Intenta con Groq (resumen
 * profesional + categorización + pulido de proyectos); si falla, usa un armado
 * determinista para que /cv NUNCA quede sin entregar.
 */
export async function structureCV(profile) {
  const especialidad = profile.especialidad
    ? labelDe(profile.especialidad, ESPECIALIDADES)
    : 'desarrollo de software';
  const nivel = profile.nivel ? labelDe(profile.nivel, NIVELES) : 'estudiante';

  const fallback = () => ({
    resumen:
      `Estudiante de ${profile.carrera} enfocado en ${especialidad}. ` +
      `Busca aplicar y seguir desarrollando habilidades en ${profile.habilidades.slice(0, 3).join(', ')}.`,
    habilidades: categorizarLocal(profile.habilidades),
    proyectos: (profile.proyectos || []).map((p) => ({ titulo: p, descripcion: '' })),
  });

  if (!config.groqKey) return fallback();

  const prompt = `Eres un experto en CVs estilo Harvard para estudiantes de tecnología en México.
Devuelve SOLO un objeto JSON válido (sin texto antes ni después) con esta forma exacta:
{
  "resumen": "2 oraciones en español, perfil profesional enfocado en ${especialidad}, nivel ${nivel}",
  "habilidades": { "Lenguajes": [], "Frameworks": [], "Bases de datos": [], "Cloud y herramientas": [], "Otras": [] },
  "proyectos": [ { "titulo": "...", "descripcion": "1 oración con verbos de acción y resultado" } ]
}

Datos del estudiante:
- Carrera: ${profile.carrera}, semestre ${profile.semestre}
- Especialidad: ${especialidad}
- Habilidades: ${profile.habilidades.join(', ')}
- Proyectos/experiencia (texto crudo): ${(profile.proyectos || []).join(' | ') || 'ninguno'}

Reglas: categoriza cada habilidad en su grupo (omite grupos vacíos). Para proyectos, pule el texto crudo a título + descripción profesional. Si no hay proyectos, devuelve [].`;

  try {
    const res = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.groqKey}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.5,
        max_tokens: 1200,
        response_format: { type: 'json_object' },
      }),
    });
    if (!res.ok) throw new Error(`Groq ${res.status}`);
    const data = await res.json();
    const raw = data.choices?.[0]?.message?.content ?? '';
    const parsed = JSON.parse(raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1));

    // Valida forma mínima; si algo falta, completa con el fallback
    const fb = fallback();
    return {
      resumen: typeof parsed.resumen === 'string' && parsed.resumen ? parsed.resumen : fb.resumen,
      habilidades:
        parsed.habilidades && typeof parsed.habilidades === 'object'
          ? Object.fromEntries(
              Object.entries(parsed.habilidades).filter(([, v]) => Array.isArray(v) && v.length)
            )
          : fb.habilidades,
      proyectos: Array.isArray(parsed.proyectos) ? parsed.proyectos : fb.proyectos,
    };
  } catch (err) {
    logger.warn({ err: err.message, telegramId: profile.telegramId }, 'structureCV cayó a fallback');
    return fallback();
  }
}

// ---------------------------------------------------------------------------
// Renderizado PDF (estilo Harvard)
// ---------------------------------------------------------------------------

function idiomasDe(habilidades) {
  const idiomas = ['Español: Nativo'];
  for (const h of habilidades) {
    if (/ingl[eé]s|franc[eé]s|alem[aá]n|portugu[eé]s/i.test(h)) {
      idiomas.push(h.charAt(0).toUpperCase() + h.slice(1));
    }
  }
  return idiomas;
}

function seccion(doc, titulo) {
  doc.moveDown(0.6);
  doc.font('Times-Bold').fontSize(11.5).fillColor('#000').text(titulo.toUpperCase());
  const y = doc.y + 1.5;
  doc
    .moveTo(doc.page.margins.left, y)
    .lineTo(doc.page.width - doc.page.margins.right, y)
    .lineWidth(0.7)
    .stroke();
  doc.moveDown(0.35);
}

/**
 * Construye el PDF y lo devuelve como Buffer.
 * @returns {Promise<Buffer>}
 */
export function buildPDF(profile, structured) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'LETTER',
      margins: { top: 50, bottom: 50, left: 60, right: 60 },
    });
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // --- Encabezado: nombre centrado + contacto ---
    doc.font('Times-Bold').fontSize(20).text(profile.nombre.toUpperCase(), { align: 'center' });
    const contacto = [profile.email, profile.github, profile.linkedin].filter(Boolean).join('   |   ');
    if (contacto) {
      doc.font('Times-Roman').fontSize(10).text(contacto, { align: 'center' });
    }
    const yLine = doc.y + 3;
    doc
      .moveTo(doc.page.margins.left, yLine)
      .lineTo(doc.page.width - doc.page.margins.right, yLine)
      .lineWidth(1.2)
      .stroke();
    doc.moveDown(0.5);

    // --- Perfil ---
    if (structured.resumen) {
      seccion(doc, 'Perfil Profesional');
      doc.font('Times-Roman').fontSize(10.5).text(structured.resumen, { align: 'justify' });
    }

    // --- Educación (primero: es lo más fuerte de un estudiante) ---
    seccion(doc, 'Educación');
    doc.font('Times-Bold').fontSize(11).text(profile.carrera);
    let sub = `Semestre ${profile.semestre}`;
    if (profile.promedio >= 8) sub += `   ·   Promedio: ${profile.promedio}`;
    doc.font('Times-Roman').fontSize(10).text(sub);

    // --- Habilidades técnicas (categorizadas) ---
    const cats = structured.habilidades || {};
    if (Object.keys(cats).length) {
      seccion(doc, 'Habilidades Técnicas');
      for (const [cat, items] of Object.entries(cats)) {
        doc.font('Times-Bold').fontSize(10).text(`${cat}: `, { continued: true });
        doc.font('Times-Roman').text(items.join(', '));
      }
    }

    // --- Proyectos ---
    if (structured.proyectos?.length) {
      seccion(doc, 'Proyectos y Experiencia');
      for (const p of structured.proyectos) {
        doc.font('Times-Bold').fontSize(10.5).text(p.titulo || p);
        if (p.descripcion) {
          doc.font('Times-Roman').fontSize(10).text(p.descripcion, { indent: 12 });
        }
        doc.moveDown(0.2);
      }
    }

    // --- Logros ---
    if (profile.logros?.length) {
      seccion(doc, 'Logros y Reconocimientos');
      for (const l of profile.logros) {
        doc.font('Times-Roman').fontSize(10).text(`•  ${l}`);
      }
    }

    // --- Idiomas ---
    seccion(doc, 'Idiomas');
    doc.font('Times-Roman').fontSize(10).text(idiomasDe(profile.habilidades).join('   ·   '));

    doc.end();
  });
}

/**
 * Orquesta todo: estructura el contenido y construye el PDF.
 * @returns {Promise<{buffer: Buffer, filename: string}>}
 */
export async function generarCV(profile) {
  const structured = await structureCV(profile);
  const buffer = await buildPDF(profile, structured);
  const slug = (profile.nombre || 'CV').replace(/\s+/g, '_');
  return { buffer, filename: `CV_${slug}.pdf` };
}
