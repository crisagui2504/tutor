import { describe, it, expect } from 'vitest';
import {
  matchSkills,
  recordScore,
  proyectarEscenarios,
} from '../src/bot/cv_matcher.js';

const market = [
  { skill: 'Python' },
  { skill: 'SQL' },
  { skill: 'Pandas' },
  { skill: 'Machine Learning' },
  { skill: 'Power BI' },
  { skill: 'NumPy' },
  { skill: 'Scikit-learn' },
  { skill: 'TensorFlow' },
  { skill: 'Tableau' },
  { skill: 'inglés' },
];

describe('matchSkills', () => {
  it('calcula score y separa have/missing', () => {
    const { score, have, missing } = matchSkills(['Python', 'SQL'], market);
    expect(score).toBe(20);
    expect(have).toEqual(['Python', 'SQL']);
    expect(missing).toContain('Pandas');
    expect(have.length + missing.length).toBe(market.length);
  });

  it('normaliza aliases (js -> JavaScript, py -> Python)', () => {
    const m = [{ skill: 'JavaScript' }, { skill: 'Python' }];
    const { score } = matchSkills(['js', 'py'], m);
    expect(score).toBe(100);
  });

  it('da 0 cuando no hay coincidencias', () => {
    expect(matchSkills(['Cobol'], market).score).toBe(0);
  });
});

describe('recordScore (dedup por mes y especialidad)', () => {
  it('agrega una entrada nueva', () => {
    const p = { cvScores: [] };
    recordScore(p, 40, 'datos-ia');
    expect(p.cvScores).toHaveLength(1);
    expect(p.cvScores[0]).toMatchObject({ score: 40, especialidad: 'datos-ia' });
  });

  it('actualiza la entrada del mismo mes+especialidad en vez de duplicar', () => {
    const p = { cvScores: [] };
    recordScore(p, 40, 'datos-ia');
    recordScore(p, 55, 'datos-ia');
    expect(p.cvScores).toHaveLength(1);
    expect(p.cvScores[0].score).toBe(55);
  });

  it('separa por especialidad distinta el mismo mes', () => {
    const p = { cvScores: [] };
    recordScore(p, 40, 'datos-ia');
    recordScore(p, 30, 'ciberseguridad');
    expect(p.cvScores).toHaveLength(2);
  });

  it('mantiene máximo 12 entradas al crecer (quita la más vieja)', () => {
    const p = { cvScores: [] };
    // 13 entradas distintas (especialidad distinta = no se deduplican)
    for (let i = 0; i < 13; i++) recordScore(p, i, `esp-${i}`);
    expect(p.cvScores).toHaveLength(12);
    expect(p.cvScores.some((s) => s.especialidad === 'esp-0')).toBe(false); // la vieja salió
  });
});

describe('proyectarEscenarios (forecasted self)', () => {
  it('proyecta el score sumando las skills más demandadas', () => {
    const proy = proyectarEscenarios(['Python', 'SQL'], market, 3);
    expect(proy.actual).toBe(20);
    expect(proy.escenarios).toHaveLength(3);
    expect(proy.escenarios[0]).toMatchObject({ skill: 'Pandas', score: 30, delta: 10 });
    expect(proy.escenarios.at(-1).score).toBe(50);
  });

  it('marca sinFaltantes cuando ya tiene todo', () => {
    const todo = market.map((m) => m.skill);
    const proy = proyectarEscenarios(todo, market, 3);
    expect(proy.sinFaltantes).toBe(true);
    expect(proy.escenarios).toHaveLength(0);
  });

  it('respeta el límite "hasta" y no excede las faltantes', () => {
    const proy = proyectarEscenarios(market.slice(0, 9).map((m) => m.skill), market, 3);
    expect(proy.escenarios).toHaveLength(1); // solo falta 1
  });
});
