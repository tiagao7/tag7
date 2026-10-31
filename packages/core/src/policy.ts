import type { ShopRules } from './types';

export interface PolicyResult {
  allowed: boolean;
  reason?: 'ALREADY_STARTED' | 'PAST_DEADLINE' | 'LIMIT_REACHED';
}

/** Cliente pode cancelar/reagendar? Só até `cancelDeadlineMin` antes do início. */
export function canCancelOrReschedule(appointmentStart: Date, now: Date, rules: ShopRules): PolicyResult {
  const ms = appointmentStart.getTime() - now.getTime();
  if (ms <= 0) return { allowed: false, reason: 'ALREADY_STARTED' };
  if (ms < rules.cancelDeadlineMin * 60_000) return { allowed: false, reason: 'PAST_DEADLINE' };
  return { allowed: true };
}

/** Limite de agendamentos ativos por cliente (anti-abuso). */
export function canBookMore(activeCount: number, rules: ShopRules): PolicyResult {
  return activeCount < rules.maxActivePerCustomer ? { allowed: true } : { allowed: false, reason: 'LIMIT_REACHED' };
}
