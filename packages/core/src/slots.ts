import type { AppointmentLike, Interval, ShopRules, WorkingHours } from './types';
import { BLOCKING_STATUSES } from './types';
import { addDays, diffDays, localDateOf, parseHm, weekdayOf, zonedToUtc } from './time';
import { validateRules, validateWorkingHours } from './validation';

const MIN = 60_000;

export interface SlotQuery {
  /** Data local do salão, YYYY-MM-DD. */
  date: string;
  /** Instante atual (injetado para permitir testes determinísticos). */
  now: Date;
  durationMin: number;
  workingHours: WorkingHours[];
  appointments: AppointmentLike[];
  timeOff: Interval[];
  rules: ShopRules;
}

/** Dois intervalos [a,b) e [c,d) se sobrepõem? */
export function overlaps(a: Interval, b: Interval): boolean {
  return a.start < b.end && b.start < a.end;
}

/**
 * Um candidato conflita se, considerando a folga (buffer) dos dois lados,
 * invade qualquer agendamento ativo.
 */
export function hasConflict(candidate: Interval, appointments: AppointmentLike[], bufferMin: number): boolean {
  const pad = bufferMin * MIN;
  return appointments.some(
    (a) =>
      BLOCKING_STATUSES.includes(a.status) &&
      candidate.start.getTime() < a.end.getTime() + pad &&
      candidate.end.getTime() + pad > a.start.getTime(),
  );
}

/** Horários livres (instantes UTC) para um serviço, em uma data local. */
export function getAvailableSlots(q: SlotQuery): Date[] {
  validateRules(q.rules);
  if (!Number.isInteger(q.durationMin) || q.durationMin <= 0) {
    throw new Error(`durationMin inválido: ${q.durationMin}`);
  }

  const { rules } = q;
  const today = localDateOf(q.now, rules.timezone);
  const ahead = diffDays(today, q.date);
  if (ahead < 0 || ahead > rules.maxAdvanceDays) return [];

  const wh = q.workingHours.find((h) => h.weekday === weekdayOf(q.date));
  if (!wh) return [];
  validateWorkingHours(wh);

  const dayStart = parseHm(wh.start);
  const dayEnd = parseHm(wh.end);
  const windows: Array<[number, number]> =
    wh.breakStart != null && wh.breakEnd != null
      ? [
          [dayStart, parseHm(wh.breakStart)],
          [parseHm(wh.breakEnd), dayEnd],
        ]
      : [[dayStart, dayEnd]];

  const earliest = q.now.getTime() + rules.minLeadMin * MIN;
  const result: Date[] = [];

  for (const [winStart, winEnd] of windows) {
    for (let t = winStart; t + q.durationMin <= winEnd; t += rules.slotStepMin) {
      const start = zonedToUtc(q.date, t, rules.timezone);
      const end = new Date(start.getTime() + q.durationMin * MIN);
      if (start.getTime() < earliest) continue;
      const candidate: Interval = { start, end };
      if (q.timeOff.some((off) => overlaps(candidate, off))) continue;
      if (hasConflict(candidate, q.appointments, rules.bufferMin)) continue;
      result.push(start);
    }
  }
  return result;
}

export interface BookableDay {
  date: string;
  slots: Date[];
}

/** Dias (hoje, D+1, D+2 ...) que ainda têm ao menos um horário livre. */
export function getBookableDays(q: Omit<SlotQuery, 'date'>): BookableDay[] {
  const today = localDateOf(q.now, q.rules.timezone);
  const days: BookableDay[] = [];
  for (let i = 0; i <= q.rules.maxAdvanceDays; i++) {
    const date = addDays(today, i);
    const slots = getAvailableSlots({ ...q, date });
    if (slots.length > 0) days.push({ date, slots });
  }
  return days;
}
