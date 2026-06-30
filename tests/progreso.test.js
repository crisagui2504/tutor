import { describe, it, expect } from 'vitest';
import { generarGraficaProgreso } from '../src/bot/progreso.js';

describe('generarGraficaProgreso', () => {
  it('muestra mensaje cuando no hay historial', () => {
    expect(generarGraficaProgreso([], 'datos-ia')).toContain('Aún no tienes historial');
  });

  it('filtra por la especialidad actual', () => {
    const scores = [
      { score: 50, fecha: new Date('2026-05-01'), especialidad: 'datos-ia' },
      { score: 30, fecha: new Date('2026-05-01'), especialidad: 'ciberseguridad' },
    ];
    const g = generarGraficaProgreso(scores, 'datos-ia');
    expect(g).toContain('50%');
    expect(g).not.toContain('30%');
  });

  it('incluye entradas viejas sin especialidad (compat hacia atrás)', () => {
    const scores = [{ score: 42, fecha: new Date('2026-04-01') }];
    expect(generarGraficaProgreso(scores, 'datos-ia')).toContain('42%');
  });

  it('calcula la tendencia entre primera y última medición', () => {
    const scores = [
      { score: 20, fecha: new Date('2026-03-01'), especialidad: 'x' },
      { score: 50, fecha: new Date('2026-05-01'), especialidad: 'x' },
    ];
    const g = generarGraficaProgreso(scores, 'x');
    expect(g).toContain('+30%');
  });
});
