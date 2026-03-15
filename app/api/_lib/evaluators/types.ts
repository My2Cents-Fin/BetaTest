import type { NotificationMessage, NotificationType, ScheduleSlot } from '../messages/types.js';

export interface PlanStatus {
  exists: boolean;
  status: 'draft' | 'frozen' | null; // null if no plan
}

export interface UserBudgetContext {
  userId: string;
  householdId: string;
  slot: ScheduleSlot;
  scheduleSlot: string; // "2026-03-04:morning"

  currentMonthPlan: PlanStatus;
  prevMonthPlan: PlanStatus;
  nextMonthPlan: PlanStatus;

  currentMonthTransactions: {
    count: number;
    totalAmount: number;
  };

  today: {
    dayOfMonth: number;
    daysInMonth: number;
    daysUntilEndOfMonth: number;
    month: string;     // "2026-03"
    prevMonth: string; // "2026-02"
    nextMonth: string; // "2026-04"
  };
}

export interface EvaluatorResult {
  message: NotificationMessage;
  notificationType: NotificationType;
  subtype: string; // e.g. "track_a:phase_3:clone:morning"
  messageData?: Record<string, unknown>;
}
