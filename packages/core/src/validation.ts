import type { ShopRules, WorkingHours } from './types';
import { assertValidTimezone, parseHm } from './time';

export function validateWorkingHours(wh: WorkingHours): void {
  if (!Number.isInteger(wh.weekday) || wh.weekday < 0 || wh.weekday > 6) {
    throw new Error(`weekday inválido: ${wh.weekday}`);
  }
  const start = parseHm(wh.start);
  const end = parseHm(wh.end);
  if (end <= start) throw new Error(`Jornada inválida: fim (${wh.end}) deve ser após o início (${wh.start})`);

  const hasBreak = wh.breakStart != null || wh.breakEnd != null;
  if (hasBreak) {
    if (wh.breakStart == null || wh.breakEnd == null) {
      throw new Error('Pausa incompleta: informe início e fim');
    }
    const bs = parseHm(wh.breakStart);
    const be = parseHm(wh.breakEnd);
    if (be <= bs) throw new Error('Pausa inválida: fim deve ser após o início');
    if (bs < start || be > end) throw new Error('Pausa deve estar dentro da jornada');
  }
}

export function validateRules(r: ShopRules): void {
  assertValidTimezone(r.timezone);
  const ints: Array<[string, number, number]> = [
    ['slotStepMin', r.slotStepMin, 5],
    ['minLeadMin', r.minLeadMin, 0],
    ['maxAdvanceDays', r.maxAdvanceDays, 0],
    ['bufferMin', r.bufferMin, 0],
    ['cancelDeadlineMin', r.cancelDeadlineMin, 0],
    ['maxActivePerCustomer', r.maxActivePerCustomer, 1],
  ];
  for (const [name, value, min] of ints) {
    if (!Number.isInteger(value) || value < min) throw new Error(`${name} inválido: ${value} (mínimo ${min})`);
  }
  if (r.maxAdvanceDays > 90) throw new Error('maxAdvanceDays não pode passar de 90');
}
