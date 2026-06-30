/**
 * Verifica que /plan sea PERSONALIZADO y no genérico.
 *
 * Genera planes para dos perfiles muy distintos y comprueba:
 *  1. Cobertura: el plan menciona las skills que le faltan a ese estudiante.
 *  2. Recursos correctos: usa plataformas propias de su especialidad.
 *  3. No se cruzan: el de ciberseguridad NO usa recursos de datos y viceversa.
 *  4. Diferencia: los dos planes son sustancialmente distintos.
 *
 * Uso:  node scripts/verificar-plan.mjs
 */
import 'dotenv/config';
import { generatePlan } from '../src/bot/planner.js';

const perfilDatos = {
  nombre: 'Ana',
  carrera: 'Ing en Sistemas',
  especialidad: 'datos-ia',
  semestre: 6,
  nivel: 'principiante',
  objetivo: 'startup',
  habilidades: ['Python', 'SQL'],
  horario: new Map([['lunes', '19:00-21:00'], ['sabado', '09:00-13:00']]),
};
const perfilCiber = {
  nombre: 'Luis',
  carrera: 'Ing en Sistemas',
  especialidad: 'ciberseguridad',
  semestre: 6,
  nivel: 'avanzado',
  objetivo: 'corporativo',
  habilidades: ['Python', 'Git'],
  horario: new Map([['martes', '20:00-22:00'], ['domingo', '10:00-12:00']]),
};

const faltantesDatos = ['Pandas', 'Machine Learning', 'Power BI'];
const faltantesCiber = ['Linux', 'Bash', 'Wireshark'];

const cuenta = (texto, palabras) =>
  palabras.filter((p) => texto.toLowerCase().includes(p.toLowerCase()));

const RES_DATOS = ['kaggle', 'fast.ai', 'datacamp', 'pandas', 'google data'];
const RES_CIBER = ['tryhackme', 'hackthebox', 'hack the box', 'overthewire', 'portswigger'];

console.log('Generando dos planes (puede tardar ~10s)...\n');
const [planDatos, planCiber] = await Promise.all([
  generatePlan(perfilDatos, faltantesDatos),
  generatePlan(perfilCiber, faltantesCiber),
]);

function reporte(nombre, plan, faltantes, recursosPropios, recursosAjenos) {
  const cubiertas = cuenta(plan, faltantes);
  const propios = cuenta(plan, recursosPropios);
  const ajenos = cuenta(plan, recursosAjenos);
  console.log(`=== Plan de ${nombre} (${plan.length} chars) ===`);
  console.log(`1. Cobertura skills faltantes: ${cubiertas.length}/${faltantes.length} -> ${cubiertas.join(', ')}`);
  console.log(`2. Recursos de SU especialidad: ${propios.length ? propios.join(', ') : 'NINGUNO ⚠️'}`);
  console.log(`3. Recursos de OTRA especialidad (debe ser 0): ${ajenos.length ? ajenos.join(', ') + ' ⚠️' : 'ninguno ✅'}`);
  console.log('');
  return { cubiertas: cubiertas.length, propios: propios.length, ajenos: ajenos.length };
}

const rD = reporte('Ana (datos-ia)', planDatos, faltantesDatos, RES_DATOS, RES_CIBER);
const rC = reporte('Luis (ciberseguridad)', planCiber, faltantesCiber, RES_CIBER, RES_DATOS);

// 4. Diferencia entre ambos planes (Jaccard de palabras significativas)
const tokens = (t) => new Set(t.toLowerCase().match(/[a-záéíóúñ.]{4,}/g) || []);
const a = tokens(planDatos);
const b = tokens(planCiber);
const inter = [...a].filter((w) => b.has(w)).length;
const union = new Set([...a, ...b]).size;
const similitud = Math.round((inter / union) * 100);

console.log('=== Veredicto ===');
console.log(`4. Similitud entre los dos planes: ${similitud}% (bajo = personalizado, alto = genérico)`);
const ok =
  rD.cubiertas >= 2 && rC.cubiertas >= 2 &&
  rD.propios >= 1 && rC.propios >= 1 &&
  rD.ajenos === 0 && rC.ajenos === 0 &&
  similitud < 40;
console.log(ok ? '\n✅ PERSONALIZADO: cubre skills, usa recursos propios y los planes difieren.'
              : '\n⚠️ Revisar: algún criterio falló (ver arriba).');
