import { describe, it, expect } from 'vitest';
import {
  ESPECIALIDADES,
  OBJETIVOS,
  parseSeleccion,
  renderMenu,
  labelDe,
} from '../src/bot/especialidades.js';

describe('parseSeleccion', () => {
  it('interpreta por número (1-based)', () => {
    expect(parseSeleccion('2', ESPECIALIDADES)).toBe(ESPECIALIDADES[1].key);
  });

  it('interpreta por texto/keyword', () => {
    expect(parseSeleccion('datos', ESPECIALIDADES)).toBe('datos-ia');
  });

  it('devuelve null para entrada inválida', () => {
    expect(parseSeleccion('99', ESPECIALIDADES)).toBeNull();
    expect(parseSeleccion('xyz', ESPECIALIDADES)).toBeNull();
  });

  it('funciona con otra lista (objetivos)', () => {
    expect(parseSeleccion('1', OBJETIVOS)).toBe(OBJETIVOS[0].key);
  });
});

describe('renderMenu', () => {
  it('numera las opciones desde 1', () => {
    const menu = renderMenu(OBJETIVOS);
    expect(menu).toContain('1.');
    expect(menu.split('\n')).toHaveLength(OBJETIVOS.length);
  });
});

describe('labelDe', () => {
  it('devuelve la etiqueta legible de una key', () => {
    expect(labelDe('datos-ia', ESPECIALIDADES)).toContain('Datos');
  });

  it('devuelve la key si no la encuentra', () => {
    expect(labelDe('inexistente', ESPECIALIDADES)).toBe('inexistente');
  });
});
