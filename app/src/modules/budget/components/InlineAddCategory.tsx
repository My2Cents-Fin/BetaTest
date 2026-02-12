import { useState, useRef, useEffect } from 'react';

interface InlineAddCategoryProps {
  onAdd: (name: string, icon: string) => Promise<{ success: boolean; error?: string }>;
  onCancel: () => void;
}

const COMMON_ICONS = ['🎓', '✈️', '🎁', '🏥', '🚗', '🏠', '📚', '🎮', '🎨', '⚽', '🎵', '💼'];

export function InlineAddCategory({ onAdd, onCancel }: InlineAddCategoryProps) {
  const [name, setName] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('📁');
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = async () => {
    const trimmed = name.trim();
    if (trimmed) {
      const result = await onAdd(trimmed, selectedIcon);
      if (!result.success && result.error) {
        setErrorMessage(result.error);
      }
    }
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value);
    if (errorMessage) {
      setErrorMessage(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit();
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };

  const handleBlur = async (e: React.FocusEvent) => {
    // Check if focus is moving to another element within this component
    const container = e.currentTarget.closest('[data-add-category-container]');
    const relatedTarget = e.relatedTarget as HTMLElement;
    if (container?.contains(relatedTarget)) {
      return; // Focus staying within container
    }
    // Focus leaving - submit if there's text, otherwise cancel
    const trimmed = name.trim();
    if (trimmed) {
      const result = await onAdd(trimmed, selectedIcon);
      if (!result.success && result.error) {
        setErrorMessage(result.error);
      }
    } else {
      onCancel();
    }
  };

  return (
    <div data-add-category-container className="px-4 py-3 bg-indigo-50 border-l-4 border-indigo-600">
      <p className="text-xs text-indigo-600 font-medium mb-2">➕ Add Custom Category</p>
      <div className="flex items-center gap-2">
        {/* Icon selector */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowIconPicker(!showIconPicker)}
            className="text-lg shrink-0 w-10 h-10 flex items-center justify-center border border-indigo-300 rounded-lg hover:bg-indigo-100 transition-colors"
          >
            {selectedIcon}
          </button>
          {showIconPicker && (
            <div className="absolute top-12 left-0 bg-white border border-gray-200 rounded-lg shadow-lg p-2 grid grid-cols-6 gap-1 z-10">
              {COMMON_ICONS.map((icon) => (
                <button
                  key={icon}
                  type="button"
                  onClick={() => {
                    setSelectedIcon(icon);
                    setShowIconPicker(false);
                  }}
                  className="w-8 h-8 flex items-center justify-center text-lg hover:bg-gray-100 rounded"
                >
                  {icon}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Name input */}
        <input
          ref={inputRef}
          type="text"
          value={name}
          onChange={handleNameChange}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          placeholder="Category name (e.g., Travel, Education)..."
          className={`flex-1 min-w-0 px-2 py-1.5 border rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 ${
            errorMessage
              ? 'border-red-400 focus:border-red-500 focus:ring-red-100'
              : 'border-indigo-300 focus:border-indigo-600 focus:ring-indigo-100'
          }`}
        />

        {/* Submit button - checkmark */}
        <button
          onClick={handleSubmit}
          disabled={!name.trim()}
          className="p-1.5 text-green-600 hover:text-green-700 active:text-green-800 disabled:text-gray-300 transition-colors shrink-0"
          aria-label="Add"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </button>

        {/* Cancel button - X */}
        <button
          onClick={onCancel}
          className="p-1.5 text-gray-400 hover:text-red-500 active:text-red-600 transition-colors shrink-0"
          aria-label="Cancel"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Error message */}
      {errorMessage && (
        <p className="mt-1 text-xs text-red-500">
          {errorMessage}
        </p>
      )}

      {/* Help text */}
      {!errorMessage && (
        <p className="mt-2 text-xs text-gray-500">
          Custom categories let you organize your budget your way.
        </p>
      )}
    </div>
  );
}
