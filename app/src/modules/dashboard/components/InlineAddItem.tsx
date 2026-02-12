import { useState, useRef, useEffect } from 'react';

interface Category {
  id: string;
  name: string;
  icon: string;
}

interface InlineAddItemProps {
  type: 'income' | 'expense';
  categoryId?: string;
  categoryName?: string;
  suggestions?: { name: string; icon: string }[]; // Static suggestions (for income or when no function provided)
  getSuggestions?: (categoryName?: string) => { name: string; icon: string }[]; // Dynamic suggestions based on category
  categories?: Category[]; // For expense category selection
  existingNames?: string[]; // Names that already exist (for duplicate prevention)
  onAdd: (name: string, icon: string, categoryId?: string) => void;
  onCancel: () => void;
  indented?: boolean;
  // showCategoryOption?: boolean; // REMOVED - custom categories disabled for now
  // onAddCategory?: (name: string, icon: string) => Promise<{ success: boolean; error?: string; category?: any }>; // REMOVED
}

export function InlineAddItem({
  type,
  categoryId,
  categoryName,
  suggestions = [],
  getSuggestions,
  categories = [],
  existingNames = [],
  onAdd,
  onCancel,
  indented = false,
  // showCategoryOption = false, // REMOVED
  // onAddCategory, // REMOVED
}: InlineAddItemProps) {
  const [name, setName] = useState('');
  const [selectedIcon, _setSelectedIcon] = useState('📦');
  const [selectedCategoryId, setSelectedCategoryId] = useState(categoryId || '');
  const [showDuplicateError, setShowDuplicateError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Set default category if not provided
  useEffect(() => {
    if (!categoryId && categories.length > 0) {
      setSelectedCategoryId(categories[0].id);
    }
  }, [categoryId, categories]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Get selected category name for dynamic suggestions
  const selectedCategory = categories.find(c => c.id === selectedCategoryId);
  const selectedCategoryName = categoryName || selectedCategory?.name;

  // Get suggestions - use dynamic function if available, otherwise static array
  const currentSuggestions = getSuggestions
    ? getSuggestions(selectedCategoryName)
    : suggestions;

  const filteredSuggestions = currentSuggestions.filter(
    s => s.name.toLowerCase().includes(name.toLowerCase())
  ).slice(0, 5);

  // Check if name already exists (case-insensitive)
  const isDuplicate = (nameToCheck: string) => {
    const normalized = nameToCheck.trim().toLowerCase();
    return existingNames.some(existing => existing.toLowerCase() === normalized);
  };

  // Clear duplicate error when name changes
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value);
    if (showDuplicateError) {
      setShowDuplicateError(false);
    }
  };

  const handleSubmit = () => {
    const trimmed = name.trim();
    if (trimmed) {
      if (isDuplicate(trimmed)) {
        setShowDuplicateError(true);
        return;
      }
      onAdd(trimmed, selectedIcon, selectedCategoryId || categoryId);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit();
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };

  const handleBlur = (e: React.FocusEvent) => {
    // Check if focus is moving to another element within this component
    const container = e.currentTarget.closest('[data-add-container]');
    const relatedTarget = e.relatedTarget as HTMLElement;
    if (container?.contains(relatedTarget)) {
      return; // Focus staying within container
    }
    // Focus leaving - submit if there's text, otherwise cancel
    const trimmed = name.trim();
    if (trimmed) {
      if (isDuplicate(trimmed)) {
        setShowDuplicateError(true);
        return;
      }
      onAdd(trimmed, selectedIcon, selectedCategoryId || categoryId);
    } else {
      onCancel();
    }
  };

  const handleSuggestionClick = (suggestion: { name: string; icon: string }) => {
    onAdd(suggestion.name, suggestion.icon, selectedCategoryId || categoryId);
  };

  return (
    <div data-add-container className={`px-4 py-3 bg-purple-50 border-l-4 border-purple-600 ${indented ? 'pl-10' : ''}`}>
      <div className="flex items-center gap-2">
        {/* Icon selector */}
        <span className="text-lg shrink-0">{selectedIcon}</span>

        {/* Category selector - only for expenses without pre-selected category */}
        {type === 'expense' && !categoryId && categories.length > 0 && (
          <div className="relative shrink-0">
            <select
              value={selectedCategoryId}
              onChange={(e) => setSelectedCategoryId(e.target.value)}
              className="
                appearance-none
                pl-2 pr-6 py-1.5
                border border-purple-300 rounded-lg
                text-sm text-gray-700
                bg-white
                focus:outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-100
                cursor-pointer
              "
            >
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.icon} {cat.name}
                </option>
              ))}
            </select>
            <svg
              className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        )}

        {/* Name input */}
        <input
          ref={inputRef}
          type="text"
          value={name}
          onChange={handleNameChange}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          placeholder={type === 'income' ? 'Income source...' : 'Expense name...'}
          className={`flex-1 min-w-0 px-2 py-1.5 border rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 ${
            showDuplicateError
              ? 'border-red-400 focus:border-red-500 focus:ring-red-100'
              : 'border-purple-300 focus:border-purple-600 focus:ring-purple-100'
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

      {/* Duplicate error message */}
      {showDuplicateError && (
        <p className="mt-1 text-xs text-red-500">
          "{name.trim()}" already exists. Please use a different name.
        </p>
      )}

      {/* Suggestions */}
      {filteredSuggestions.length > 0 && !showDuplicateError && (
        <div className="mt-2 flex flex-wrap gap-2">
          {filteredSuggestions.map((suggestion) => (
            <button
              key={suggestion.name}
              onMouseDown={(e) => {
                e.preventDefault(); // Prevent input blur
                handleSuggestionClick(suggestion);
              }}
              className="inline-flex items-center gap-1 px-2 py-1 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 hover:border-purple-300 hover:bg-purple-50 transition-colors"
            >
              <span>{suggestion.icon}</span>
              <span>{suggestion.name}</span>
            </button>
          ))}
        </div>
      )}

      {/* Category context */}
      {categoryName && (
        <p className="mt-2 text-xs text-gray-500">
          Adding to: {categoryName}
        </p>
      )}
    </div>
  );
}
