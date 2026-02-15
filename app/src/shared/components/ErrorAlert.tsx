interface ErrorAlertProps {
  message: string;
}

export function ErrorAlert({ message }: ErrorAlertProps) {
  return (
    <div className="flex items-start gap-3 px-4 py-3 bg-[var(--color-danger)]/5 border border-[var(--color-danger)]/20 rounded-xl mb-6">
      <span className="text-lg flex-shrink-0 text-[var(--color-danger)]">⚠</span>
      <span className="text-sm font-medium text-[var(--color-danger)]">{message}</span>
    </div>
  );
}
