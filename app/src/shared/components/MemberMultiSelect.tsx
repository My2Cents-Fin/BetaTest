import { useState, useRef, useEffect } from 'react';

interface MemberMultiSelectProps {
  label: string;
  members: { id: string; name: string }[];
  selectedIds: string[];
  onToggle: (id: string) => void;
}

export function MemberMultiSelect({ label, members, selectedIds, onToggle }: MemberMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedNames = members.filter(m => selectedIds.includes(m.id)).map(m => m.name);
  const displayText = selectedNames.length === 0
    ? 'All members'
    : selectedNames.length === members.length
      ? 'All members'
      : selectedNames.join(', ');

  return (
    <div>
      <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5 block">{label}</label>
      <div className="relative" ref={ref}>
        <button
          onClick={() => setOpen(!open)}
          className="w-full px-3 py-2 text-left text-xs border border-gray-200 rounded-lg bg-white hover:border-purple-300 focus:outline-none focus:border-purple-400 flex items-center justify-between gap-2"
        >
          <span className="text-gray-700 truncate">{displayText}</span>
          <svg
            className={`w-3.5 h-3.5 text-gray-400 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {open && (
          <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-1 max-h-48 overflow-y-auto">
            {members.map(m => (
              <label
                key={m.id}
                className="flex items-center gap-2.5 px-3 py-2 hover:bg-gray-50 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selectedIds.includes(m.id)}
                  onChange={() => onToggle(m.id)}
                  className="w-3.5 h-3.5 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                />
                <span className="text-xs text-gray-700">{m.name}</span>
              </label>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
