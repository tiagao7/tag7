/**
 * Utilitários de fuso horário sem dependências (usa Intl, disponível em
 * Node e Cloudflare Workers). Datas locais são strings "YYYY-MM-DD".
 */

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function parseDate(date: string): { y: number; m: number; d: number } {
  const match = DATE_RE.exec(date);
  if (!match) throw new Error(`Data inválida: "${date}" (esperado YYYY-MM-DD)`);
  const y = Number(match[1]);
  const m = Number(match[2]);
  const d = Number(match[3]);
  const check = new Date(Date.UTC(y, m - 1, d));
  if (check.getUTCFullYear() !== y || check.getUTCMonth() !== m - 1 || check.getUTCDate() !== d) {
    throw new Error(`Data inexistente: "${date}"`);
  }
  return { y, m, d };
}

/** "HH:MM" -> minutos desde 00:00. */
export function parseHm(time: string): number {
  const match = TIME_RE.exec(time);
  if (!match) throw new Error(`Hora inválida: "${time}" (esperado HH:MM)`);
  return Number(match[1]) * 60 + Number(match[2]);
}

export function weekdayOf(date: string): number {
  const { y, m, d } = parseDate(date);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

export function addDays(date: string, days: number): string {
  const { y, m, d } = parseDate(date);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/** Diferença em dias de calendário (b - a). */
export function diffDays(a: string, b: string): number {
  const pa = parseDate(a);
  const pb = parseDate(b);
  return Math.round(
    (Date.UTC(pb.y, pb.m - 1, pb.d) - Date.UTC(pa.y, pa.m - 1, pa.d)) / 86_400_000,
  );
}

const formatterCache = new Map<string, Intl.DateTimeFormat>();
function formatter(timeZone: string): Intl.DateTimeFormat {
  let f = formatterCache.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    formatterCache.set(timeZone, f);
  }
  return f;
}

function wallParts(ts: number, timeZone: string) {
  const out: Record<string, number> = {};
  for (const p of formatter(timeZone).formatToParts(new Date(ts))) {
    if (p.type !== 'literal') out[p.type] = Number(p.value);
  }
  return out as { year: number; month: number; day: number; hour: number; minute: number; second: number };
}

/** Offset (ms) do fuso em relação ao UTC no instante `ts`. */
function tzOffsetMs(ts: number, timeZone: string): number {
  const p = wallParts(ts, timeZone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - Math.floor(ts / 1000) * 1000;
}

/** Data local (YYYY-MM-DD) de um instante, no fuso informado. */
export function localDateOf(instant: Date, timeZone: string): string {
  const p = wallParts(instant.getTime(), timeZone);
  return `${String(p.year).padStart(4, '0')}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`;
}

/** Converte data+minutos locais (ex.: 2026-11-02 + 540) em instante UTC. */
export function zonedToUtc(date: string, minutes: number, timeZone: string): Date {
  const { y, m, d } = parseDate(date);
  const guess = Date.UTC(y, m - 1, d, 0, minutes);
  const off1 = tzOffsetMs(guess, timeZone);
  let utc = guess - off1;
  const off2 = tzOffsetMs(utc, timeZone);
  if (off2 !== off1) utc = guess - off2; // cruzou mudança de horário de verão
  return new Date(utc);
}

export function assertValidTimezone(timeZone: string): void {
  try {
    formatter(timeZone);
  } catch {
    throw new Error(`Fuso horário inválido: "${timeZone}"`);
  }
}
