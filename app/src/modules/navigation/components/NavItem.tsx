interface NavItemProps {
  icon: string;
  label: string;
  active: boolean;
  onClick?: () => void;
  collapsed?: boolean;
  locked?: boolean;
}

export function NavItem({ icon, label, active, onClick, collapsed = false, locked = false }: NavItemProps) {
  if (collapsed) {
    return (
      <button
        onClick={locked ? undefined : onClick}
        disabled={locked}
        className={`
          w-full flex flex-col items-center justify-center py-2.5 rounded-xl transition-colors relative
          ${locked
            ? 'text-gray-300 cursor-not-allowed'
            : active
              ? 'bg-[var(--color-primary-bg)] text-[var(--color-primary)]'
              : 'text-gray-600 hover:bg-white/60'}
        `}
        title={label}
      >
        <span className="text-xl relative">
          {icon}
          {locked && <span className="absolute -top-1 -right-1 text-xs">🔒</span>}
        </span>
        <span className="text-[10px] font-medium mt-0.5">{label}</span>
      </button>
    );
  }

  return (
    <button
      onClick={locked ? undefined : onClick}
      disabled={locked}
      className={`
        w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors
        ${locked
          ? 'text-gray-300 cursor-not-allowed'
          : active
            ? 'bg-[var(--color-primary-bg)] text-[var(--color-primary)]'
            : 'text-gray-600 hover:bg-white/60'}
      `}
    >
      <span className="text-xl relative">
        {icon}
        {locked && <span className="absolute -top-1 -right-1 text-xs">🔒</span>}
      </span>
      <span className="font-medium">{label}</span>
    </button>
  );
}
