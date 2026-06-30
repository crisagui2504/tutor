import { describe, it, expect } from 'vitest';
import {
  nivel,
  otorgarPuntos,
  actualizarRacha,
  formatPuntos,
} from '../src/bot/gamificacion.js';

describe('nivel', () => {
  it('es 1 con 0-99 puntos y sube cada 100', () => {
    expect(nivel(0)).toBe(1);
    expect(nivel(99)).toBe(1);
    expect(nivel(100)).toBe(2);
    expect(nivel(250)).toBe(3);
  });

  it('tolera undefined', () => {
    expect(nivel(undefined)).toBe(1);
  });
});

describe('otorgarPuntos', () => {
  it('suma puntos y detecta subida de nivel', () => {
    const p = { puntos: 80 };
    const r = otorgarPuntos(p, 50);
    expect(p.puntos).toBe(130);
    expect(r.total).toBe(130);
    expect(r.subioNivel).toBe(true);
    expect(r.nivel).toBe(2);
  });

  it('no marca subida si no cruza el umbral', () => {
    const p = { puntos: 10 };
    const r = otorgarPuntos(p, 30);
    expect(r.subioNivel).toBe(false);
  });

  it('arranca desde 0 si puntos es undefined', () => {
    const p = {};
    otorgarPuntos(p, 10);
    expect(p.puntos).toBe(10);
  });
});

describe('actualizarRacha', () => {
  it('incrementa con éxito y guarda fecha', () => {
    const p = { racha: 2 };
    expect(actualizarRacha(p, true)).toBe(3);
    expect(p.ultimaActividad).toBeInstanceOf(Date);
  });

  it('reinicia a 0 al fallar', () => {
    const p = { racha: 5 };
    expect(actualizarRacha(p, false)).toBe(0);
  });
});

describe('formatPuntos', () => {
  it('incluye puntos, nivel y racha', () => {
    const msg = formatPuntos({ puntos: 130, racha: 3 });
    expect(msg).toContain('130');
    expect(msg).toContain('Nivel *2*');
    expect(msg).toContain('3');
  });
});
