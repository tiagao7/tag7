import { describe, expect, it } from 'vitest';
import {
  DEFAULT_RULES,
  getAvailableSlots,
  getBookableDays,
  hasConflict,
  type AppointmentLike,
  type ShopRules,
  type SlotQuery,
  type WorkingHours,
} from '../src';

// Segunda 2026-11-02, 10:00 em São Paulo (UTC-3)
const NOW = new Date('2026-11-02T13:00:00Z');
const at = (hhmm: string, date = '2026-11-02') => new Date(`${date}T${hhmm}:00-03:00`);

const week = (days: number[], extra: Partial<WorkingHours> = {}): WorkingHours[] =>
  days.map((weekday) => ({ weekday, start: '09:00', end: '18:00', breakStart: '12:00', breakEnd: '13:00', ...extra }));

const rules: ShopRules = { ...DEFAULT_RULES, minLeadMin: 60, bufferMin: 0, slotStepMin: 30, maxAdvanceDays: 7 };

const base = (over: Partial<SlotQuery> = {}): SlotQuery => ({
  date: '2026-11-02',
  now: NOW,
  durationMin: 30,
  workingHours: week([1, 2, 3, 4, 5, 6]),
  appointments: [],
  timeOff: [],
  rules,
  ...over,
});

const hhmm = (d: Date) =>
  new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(d);

describe('getAvailableSlots', () => {
  it('hoje só oferece horários futuros respeitando antecedência mínima', () => {
    const slots = getAvailableSlots(base()).map(hhmm);
    expect(slots[0]).toBe('11:00'); // agora 10:00 + 60 min
    expect(slots).not.toContain('10:30');
  });

  it('não oferece horários durante a pausa', () => {
    const slots = getAvailableSlots(base({ date: '2026-11-03' })).map(hhmm);
    expect(slots).toContain('11:30');
    expect(slots).not.toContain('12:00');
    expect(slots).not.toContain('12:30');
    expect(slots).toContain('13:00');
  });

  it('serviço que atravessaria a pausa ou o fim do expediente é bloqueado', () => {
    const slots = getAvailableSlots(base({ date: '2026-11-03', durationMin: 60 })).map(hhmm);
    expect(slots).toContain('11:00'); // termina 12:00
    expect(slots).not.toContain('11:30'); // invadiria a pausa
    expect(slots).toContain('17:00'); // termina 18:00
    expect(slots).not.toContain('17:30');
  });

  it('remove horários ocupados e ignora cancelados/reagendados', () => {
    const appointments: AppointmentLike[] = [
      { start: at('14:00', '2026-11-03'), end: at('14:30', '2026-11-03'), status: 'CONFIRMED' },
      { start: at('15:00', '2026-11-03'), end: at('15:30', '2026-11-03'), status: 'CANCELLED' },
      { start: at('16:00', '2026-11-03'), end: at('16:30', '2026-11-03'), status: 'RESCHEDULED' },
    ];
    const slots = getAvailableSlots(base({ date: '2026-11-03', appointments })).map(hhmm);
    expect(slots).not.toContain('14:00');
    expect(slots).toContain('15:00');
    expect(slots).toContain('16:00');
  });

  it('serviço longo não pode invadir o início de outro agendamento', () => {
    const appointments: AppointmentLike[] = [
      { start: at('14:00', '2026-11-03'), end: at('14:30', '2026-11-03'), status: 'CONFIRMED' },
    ];
    const slots = getAvailableSlots(base({ date: '2026-11-03', durationMin: 60, appointments })).map(hhmm);
    expect(slots).not.toContain('13:30'); // 13:30-14:30 invade
    expect(slots).toContain('13:00'); // 13:00-14:00 encosta mas não invade
  });

  it('aplica folga (buffer) entre atendimentos', () => {
    const appointments: AppointmentLike[] = [
      { start: at('14:00', '2026-11-03'), end: at('14:30', '2026-11-03'), status: 'CONFIRMED' },
    ];
    const slots = getAvailableSlots(base({ date: '2026-11-03', appointments, rules: { ...rules, bufferMin: 15 } })).map(hhmm);
    expect(slots).not.toContain('13:30'); // termina 14:00, sem folga
    expect(slots).not.toContain('14:30'); // começa 14:30, sem folga
    expect(slots).toContain('13:00');
    expect(slots).toContain('15:00');
  });

  it('respeita folgas/bloqueios do barbeiro', () => {
    const timeOff = [{ start: at('15:00', '2026-11-03'), end: at('17:00', '2026-11-03') }];
    const slots = getAvailableSlots(base({ date: '2026-11-03', timeOff })).map(hhmm);
    expect(slots).toContain('14:30');
    expect(slots).not.toContain('15:00');
    expect(slots).not.toContain('16:30');
    expect(slots).toContain('17:00');
  });

  it('dia sem expediente, data passada e além do limite retornam vazio', () => {
    expect(getAvailableSlots(base({ date: '2026-11-08' }))).toEqual([]); // domingo
    expect(getAvailableSlots(base({ date: '2026-11-01' }))).toEqual([]); // ontem
    expect(getAvailableSlots(base({ date: '2026-11-10' }))).toEqual([]); // D+8
    expect(getAvailableSlots(base({ date: '2026-11-09' })).length).toBeGreaterThan(0); // D+7
  });

  it('é determinístico e ordenado', () => {
    const a = getAvailableSlots(base({ date: '2026-11-04' }));
    const sorted = [...a].sort((x, y) => x.getTime() - y.getTime());
    expect(a).toEqual(sorted);
  });

  it('valida jornada e regras inválidas', () => {
    expect(() => getAvailableSlots(base({ workingHours: week([1], { end: '08:00' }) }))).toThrow();
    expect(() => getAvailableSlots(base({ workingHours: week([1], { breakEnd: '19:00' }) }))).toThrow();
    expect(() => getAvailableSlots(base({ rules: { ...rules, timezone: 'Mars/Olympus' } }))).toThrow();
    expect(() => getAvailableSlots(base({ durationMin: 0 }))).toThrow();
  });
});

describe('getBookableDays', () => {
  it('lista hoje e os próximos dias, pulando dias sem expediente', () => {
    const { date: _d, ...q } = base();
    const days = getBookableDays(q);
    const dates = days.map((d) => d.date);
    expect(dates[0]).toBe('2026-11-02');
    expect(dates).not.toContain('2026-11-08'); // domingo fechado
    expect(dates).toContain('2026-11-09');
  });

  it('remove "hoje" quando já passou do horário', () => {
    const late = new Date('2026-11-02T20:30:00Z'); // 17:30 em SP
    const { date: _d, ...q } = base({ now: late });
    const days = getBookableDays(q);
    expect(days[0]?.date).toBe('2026-11-03');
  });
});

describe('hasConflict', () => {
  it('detecta sobreposição parcial e total, mas não encosto', () => {
    const appt: AppointmentLike = { start: at('10:00'), end: at('11:00'), status: 'CONFIRMED' };
    expect(hasConflict({ start: at('10:30'), end: at('11:30') }, [appt], 0)).toBe(true);
    expect(hasConflict({ start: at('09:00'), end: at('12:00') }, [appt], 0)).toBe(true);
    expect(hasConflict({ start: at('11:00'), end: at('11:30') }, [appt], 0)).toBe(false);
    expect(hasConflict({ start: at('09:30'), end: at('10:00') }, [appt], 0)).toBe(false);
  });
});
