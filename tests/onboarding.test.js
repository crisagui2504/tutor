import { describe, it, expect } from 'vitest';
import { steps } from '../src/bot/onboarding.js';
import { STATES } from '../src/bot/states.js';

describe('FSM onboarding — validaciones y transiciones', () => {
  it('ASK_NOMBRE rechaza nombres muy cortos', () => {
    const r = steps[STATES.ASK_NOMBRE].handle('a', {});
    expect(r.ok).toBe(false);
  });

  it('ASK_NOMBRE acepta y avanza a CARRERA', () => {
    const p = {};
    const r = steps[STATES.ASK_NOMBRE].handle('Cristian', p);
    expect(r).toMatchObject({ ok: true, next: STATES.ASK_CARRERA });
    expect(p.nombre).toBe('Cristian');
  });

  it('ASK_SEMESTRE solo acepta 1-14', () => {
    expect(steps[STATES.ASK_SEMESTRE].handle('0', {}).ok).toBe(false);
    expect(steps[STATES.ASK_SEMESTRE].handle('15', {}).ok).toBe(false);
    expect(steps[STATES.ASK_SEMESTRE].handle('6', {}).ok).toBe(true);
  });

  it('ASK_PROMEDIO acepta coma decimal y rango 0-10', () => {
    const p = {};
    expect(steps[STATES.ASK_PROMEDIO].handle('8,5', p).ok).toBe(true);
    expect(p.promedio).toBe(8.5);
    expect(steps[STATES.ASK_PROMEDIO].handle('11', {}).ok).toBe(false);
  });

  it('ASK_ESPECIALIDAD: número selecciona, "aún no lo sé" cae al default', () => {
    const p = {};
    steps[STATES.ASK_ESPECIALIDAD].handle('2', p);
    expect(p.especialidad).toBeTruthy();
    const p2 = {};
    steps[STATES.ASK_ESPECIALIDAD].handle('6', p2); // opción extra
    expect(p2.especialidad).toBe('desarrollo-web');
  });

  it('ASK_HABILIDADES parte por comas y filtra vacíos', () => {
    const p = {};
    const r = steps[STATES.ASK_HABILIDADES].handle('Python, , SQL ,Git', p);
    expect(r.ok).toBe(true);
    expect(p.habilidades).toEqual(['Python', 'SQL', 'Git']);
    expect(r.next).toBe(STATES.ASK_NIVEL);
  });

  it('ASK_HORARIO parsea día + rango y vuelve a tolerar acentos', () => {
    const p = {};
    const r = steps[STATES.ASK_HORARIO].handle('lunes 19:00-21:00, sábado 09:00-13:00', p);
    expect(r.ok).toBe(true);
    expect(p.horario).toMatchObject({ lunes: '19:00-21:00', sabado: '09:00-13:00' });
    expect(r.next).toBe(STATES.DONE);
  });

  it('ASK_HORARIO rechaza texto sin horario válido', () => {
    expect(steps[STATES.ASK_HORARIO].handle('cuando pueda', {}).ok).toBe(false);
  });

  it('EDIT_HABILIDADES vuelve a DONE (no continúa el onboarding)', () => {
    const r = steps[STATES.EDIT_HABILIDADES].handle('React, Docker', {});
    expect(r.next).toBe(STATES.DONE);
  });
});
