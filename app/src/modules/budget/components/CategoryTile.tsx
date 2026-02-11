interface CategoryTileProps {
  name: string;
  icon: string | null;
  selected: boolean;
  onToggle: () => void;
  disabled?: boolean;
}

/**
 * Selectable tile for income/expense category selection
 *
 * States:
 * - Default: white background, gray border
 * - Hover: purple-50 background, purple-200 border
 * - Selected: purple-50 background, purple-800 border, checkmark
 */
export function CategoryTile({
  name,
  icon,
  selected,
  onToggle,
  disabled = false,
}: CategoryTileProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      className={`
        relative flex flex-col items-center justify-center
        p-4 rounded-xl border-2 transition-all duration-150
        min-h-[100px] w-full
        focus:outline-none focus:ring-2 focus:ring-purple-200 focus:ring-offset-2
        disabled:opacity-50 disabled:cursor-not-allowed
        ${selected
          ? 'border-purple-800 bg-purple-50'
          : 'border-gray-200 bg-white hover:border-purple-200 hover:bg-purple-50'
        }
      `}
    >
      {/* Checkmark indicator */}
      {selected && (
        <div className="absolute top-2 right-2 w-5 h-5 bg-purple-800 rounded-full flex items-center justify-center">
          <svg
            className="w-3 h-3 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={3}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
      )}

      {/* Icon */}
      <span className="text-2xl mb-2" role="img" aria-hidden="true">
        {icon || '📋'}
      </span>

      {/* Name */}
      <span className="text-sm font-medium text-gray-900 text-center leading-tight">
        {name}
      </span>
    </button>
  );
}

/**
 * "Add Custom" tile with plus icon
 */
interface AddCustomTileProps {
  onClick: () => void;
  disabled?: boolean;
}

export function AddCustomTile({ onClick, disabled = false }: AddCustomTileProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="
        relative flex flex-col items-center justify-center
        p-4 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50
        min-h-[100px] w-full
        transition-all duration-150
        hover:border-purple-300 hover:bg-purple-50
        focus:outline-none focus:ring-2 focus:ring-purple-200 focus:ring-offset-2
        disabled:opacity-50 disabled:cursor-not-allowed
      "
    >
      {/* Plus icon */}
      <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center mb-2">
        <svg
          className="w-5 h-5 text-gray-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 4v16m8-8H4"
          />
        </svg>
      </div>

      {/* Label */}
      <span className="text-sm font-medium text-gray-500">
        Add custom
      </span>
    </button>
  );
}
