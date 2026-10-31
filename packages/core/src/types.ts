export type AppointmentStatus =
  | 'CONFIRMED'
  | 'CANCELLED'
  | 'RESCHEDULED'
  | 'DONE'
  | 'NO_SHOW';

/** Status que ocupam a agenda. CANCELLED/RESCHEDULED liberam o horário. */
export const BLOCKING_STATUSES: readonly AppointmentStatus[] = ['CONFIRMED', 'DONE'];

/** Jornada de um dia da semana. Horas locais "HH:MM". weekday: 0=domingo ... 6=sábado. */
export interface WorkingHours {
  weekday: number;
  start: string;
  end: string;
  breakStart?: string | null;
  breakEnd?: string | null;
}

export interface Interval {
  start: Date;
  end: Date;
}

export interface AppointmentLike extends Interval {
  status: AppointmentStatus;
}

export interface ShopRules {
  /** IANA, ex.: America/Sao_Paulo */
  timezone: string;
  /** Granularidade dos horários oferecidos (min). */
  slotStepMin: number;
  /** Antecedência mínima para agendar (min). */
  minLeadMin: number;
  /** Até quantos dias à frente se pode agendar (0 = só hoje). */
  maxAdvanceDays: number;
  /** Folga entre atendimentos (min). */
  bufferMin: number;
  /** Prazo limite para cancelar/reagendar, antes do horário (min). */
  cancelDeadlineMin: number;
  /** Máximo de agendamentos ativos por cliente. */
  maxActivePerCustomer: number;
}

export const DEFAULT_RULES: ShopRules = {
  timezone: 'America/Sao_Paulo',
  slotStepMin: 30,
  minLeadMin: 60,
  maxAdvanceDays: 7,
  bufferMin: 0,
  cancelDeadlineMin: 120,
  maxActivePerCustomer: 2,
};
