import { describe, expect, it } from 'vitest';
import { DEFAULT_RULES, canBookMore, canCancelOrReschedule, generateManageToken, hashToken, safeEqual } from '../src';

const now = new Date('2026-11-02T13:00:00Z');
const inMin = (m: number) => new Date(now.getTime() + m * 60_000);

describe('policy', () => {
  it('permite cancelar com antecedência suficiente', () => {
    expect(canCancelOrReschedule(inMin(180), now, DEFAULT_RULES).allowed).toBe(true);
  });
  it('bloqueia dentro do prazo limite', () => {
    expect(canCancelOrReschedule(inMin(60), now, DEFAULT_RULES)).toEqual({ allowed: false, reason: 'PAST_DEADLINE' });
  });
  it('bloqueia se já começou', () => {
    expect(canCancelOrReschedule(inMin(-5), now, DEFAULT_RULES)).toEqual({ allowed: false, reason: 'ALREADY_STARTED' });
  });
  it('limita agendamentos ativos por cliente', () => {
    expect(canBookMore(1, DEFAULT_RULES).allowed).toBe(true);
    expect(canBookMore(2, DEFAULT_RULES)).toEqual({ allowed: false, reason: 'LIMIT_REACHED' });
  });
});

describe('token', () => {
  it('gera tokens longos, únicos e seguros para URL', () => {
    const a = generateManageToken();
    const b = generateManageToken();
    expect(a).not.toBe(b);
    expect(a).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });
  it('hash é estável e não revela o token', async () => {
    const t = generateManageToken();
    const h1 = await hashToken(t);
    expect(h1).toBe(await hashToken(t));
    expect(h1).toMatch(/^[0-9a-f]{64}$/);
    expect(h1).not.toContain(t);
  });
  it('safeEqual compara corretamente', () => {
    expect(safeEqual('abc', 'abc')).toBe(true);
    expect(safeEqual('abc', 'abd')).toBe(false);
    expect(safeEqual('abc', 'abcd')).toBe(false);
  });
});
