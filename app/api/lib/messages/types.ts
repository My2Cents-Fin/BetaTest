export interface NotificationMessage {
  title: string;
  body: string;
  tag: string;
  url?: string;
}

export type NotificationType = 'budget_reminder' | 'expense_reminder' | 'release_update' | 'welcome';
export type ScheduleSlot = 'morning' | 'evening';
