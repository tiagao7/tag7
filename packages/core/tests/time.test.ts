import { describe, expect, it } from 'vitest';
import { addDays, diffDays, localDateOf, parseHm, weekdayOf, zonedToUtc } from '../src';

describe('time', () => {
  it('converte horário de São Paulo (UTC-3) para UTC', () => {
    expect(zonedToUtc('2026-11-02', 9 * 60, 'America/Sao_Paulo').toISOString()).toBe('2026-11-02T12:00:00.000Z');
  });

  it('respeita horário de verão em fusos que o usam', () => {
    expect(zonedToUtc('2026-07-01', 9 * 60, 'America/New_York').toISOString()).toBe('2026-07-01T13:00:00.000Z');
    expect(zonedToUtc('2026-01-15', 9 * 60, 'America/New_York').toISOString()).toBe('2026-01-15T14:00:00.000Z');
  });

  it('data local vira o dia conforme o fuso (virada de dia)', () => {
    const instant = new Date('2026-11-03T01:30:00Z'); // 22:30 do dia 02 em SP
    expect(localDateOf(instant, 'America/Sao_Paulo')).toBe('2026-11-02');
    expect(localDateOf(instant, 'UTC')).toBe('2026-11-03');
  });

  it('calcula dias e dia da semana', () => {
    expect(addDays('2026-12-30', 3)).toBe('2027-01-02');
    expect(diffDays('2026-11-02', '2026-11-05')).toBe(3);
    expect(weekdayOf('2026-11-02')).toBe(1); // segunda
  });

  it('rejeita entradas inválidas', () => {
    expect(() => parseHm('25:00')).toThrow();
    expect(() => parseHm('9:00')).toThrow();
    expect(() => weekdayOf('2026-02-30')).toThrow();
    expect(() => weekdayOf('02/11/2026')).toThrow();
  });
});
