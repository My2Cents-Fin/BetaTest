import { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AmountInput } from './AmountInput';
import type { Period } from '../types';
import { calculateMonthlyAmount, getIncomeTemplates } from '../data/defaultCategories';
import { saveIncomeProgress, loadIncomeProgress } from '../services/budget';
import { useAuth } from '../../../app/providers/AuthProvider';
import { getUserHousehold } from '../../onboarding/services/onboarding';

interface IncomeItem {
  id: string;
  name: string;
  icon: string | null;
  isCustom: boolean;
  amount: number;
  period: Period;
}

/**
 * Income Amounts Screen (Step 3b)
 *
 * Compact layout with inline add (Notion-style)
 */
export function IncomeAmountsScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const addInputRef = useRef<HTMLInputElement>(null);
  const { signOut } = useAuth();

  // Get data from navigation state or fetch it
  const [householdId, setHouseholdId] = useState<string | undefined>(location.state?.householdId);
  const [householdName, setHouseholdName] = useState<string | undefined>(location.state?.householdName);
  const initialSelections = location.state?.incomeSelections || [];
  const initialAllocations = location.state?.incomeAllocations || [];

  // Loading state for saved progress
  const [isLoadingProgress, setIsLoadingProgress] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showSignOutModal, setShowSignOutModal] = useState(false);

  // All available templates
  const allTemplates = getIncomeTemplates();

  // Income items with amounts
  const [incomeItems, setIncomeItems] = useState<IncomeItem[]>(() => {
    return initialSelections.map((s: { id: string; name: string; icon: string | null }) => {
      // Restore amount/period if coming back from later screen
      const savedAlloc = initialAllocations[s.name];
      return {
        id: s.id,
        name: s.name,
        icon: s.icon,
        isCustom: s.id.startsWith('custom-'),
        amount: savedAlloc?.amount || 0,
        period: (savedAlloc?.period as Period) || 'monthly',
      };
    });
  });

  // Inline add state
  const [showAddInput, setShowAddInput] = useState(false);
  const [addInputValue, setAddInputValue] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  // Focus input when shown
  useEffect(() => {
    if (showAddInput && addInputRef.current) {
      addInputRef.current.focus();
    }
  }, [showAddInput]);

  // Fetch household if not in state, then load saved progress
  useEffect(() => {
    async function initializeData() {
      let hId = householdId;

      // Fetch household if not in state
      if (!hId) {
        setIsLoadingProgress(true);
        try {
          const household = await getUserHousehold();
          if (household) {
            hId = household.id;
            setHouseholdId(household.id);
            setHouseholdName(household.name);
          }
        } catch (e) {
          console.error('Error fetching household:', e);
          setIsLoadingProgress(false);
          return;
        }
      }

      // Load saved progress if no initial selections
      if (initialSelections.length === 0 && hId) {
        setIsLoadingProgress(true);
        const result = await loadIncomeProgress(hId);
        if (result.success && result.incomeItems && result.incomeItems.length > 0) {
          setIncomeItems(result.incomeItems);
        }
      }

      setIsLoadingProgress(false);
    }

    initializeData();
  }, []);

  // Handle sign out - save progress first
  const handleSignOut = async () => {
    if (!householdId) {
      await signOut();
      navigate('/login');
      return;
    }

    setIsSaving(true);
    await saveIncomeProgress(householdId, incomeItems);
    await signOut();
    navigate('/login');
  };

  // Show confirmation modal
  const handleSignOutClick = () => {
    setShowSignOutModal(true);
  };

  // Get IDs already added
  const addedIds = new Set(incomeItems.map(item => item.id));
  const addedNames = new Set(incomeItems.map(item => item.name.toLowerCase()));

  // Filter suggestions based on input
  const suggestions = allTemplates.filter(t =>
    !addedIds.has(t.id) &&
    t.name.toLowerCase().includes(addInputValue.toLowerCase())
  );

  // Update item
  const updateItem = (id: string, updates: Partial<IncomeItem>) => {
    setIncomeItems(prev =>
      prev.map(item => (item.id === id ? { ...item, ...updates } : item))
    );
  };

  // Remove item
  const removeItem = (id: string) => {
    setIncomeItems(prev => prev.filter(item => item.id !== id));
  };

  // Add from suggestion
  const addFromSuggestion = (template: typeof allTemplates[0]) => {
    setIncomeItems(prev => [
      ...prev,
      {
        id: template.id,
        name: template.name,
        icon: template.icon,
        isCustom: false,
        amount: 0,
        period: 'monthly',
      },
    ]);
    setAddInputValue('');
    setShowAddInput(false);
    setShowSuggestions(false);
  };

  // Add custom
  const addCustom = () => {
    const trimmed = addInputValue.trim();
    if (!trimmed) return;

    // Check for duplicate name
    if (addedNames.has(trimmed.toLowerCase())) {
      setAddError(`"${trimmed}" already exists`);
      return;
    }

    setIncomeItems(prev => [
      ...prev,
      {
        id: `custom-${Date.now()}`,
        name: trimmed,
        icon: '💵',
        isCustom: true,
        amount: 0,
        period: 'monthly',
      },
    ]);
    setAddInputValue('');
    setShowAddInput(false);
    setShowSuggestions(false);
  };

  // Handle input keydown
  const handleAddKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (suggestions.length > 0 && addInputValue) {
        addFromSuggestion(suggestions[0]);
      } else if (addInputValue.trim()) {
        addCustom();
      }
    } else if (e.key === 'Escape') {
      setShowAddInput(false);
      setAddInputValue('');
      setShowSuggestions(false);
    }
  };

  // Calculate total
  const totalMonthlyIncome = useMemo(() => {
    return incomeItems.reduce((total, item) => {
      if (item.amount > 0) {
        return total + calculateMonthlyAmount(item.amount, item.period);
      }
      return total;
    }, 0);
  }, [incomeItems]);

  // Check if ALL income items have amounts filled
  const allAmountsFilled = incomeItems.length > 0 && incomeItems.every(item => item.amount > 0);

  // Build allocations map for passing to next/previous screen
  const buildAllocations = () => {
    const allocations: Record<string, { amount: number; period: Period }> = {};
    incomeItems.forEach(item => {
      allocations[item.name] = { amount: item.amount, period: item.period };
    });
    return allocations;
  };

  // Build selections for passing
  const buildSelections = () => {
    return incomeItems.map(item => ({
      id: item.id,
      category_id: 'income',
      name: item.name,
      icon: item.icon,
      is_default_selected: false,
      display_order: 0,
    }));
  };

  // Continue (for now just show alert since expenses screen doesn't exist)
  const handleContinue = () => {
    // TODO: Navigate to expenses when that screen exists
    navigate('/onboarding/budget/expenses', {
      state: {
        householdId,
        householdName,
        incomeSelections: buildSelections(),
        incomeAllocations: buildAllocations(),
        totalMonthlyIncome,
      },
    });
  };

  // Go back - preserve everything
  const handleBack = () => {
    navigate('/onboarding/budget/income', {
      state: {
        householdId,
        householdName,
        previousSelections: buildSelections(),
        previousAllocations: buildAllocations(),
      },
    });
  };

  // Format number (round UP to next integer)
  const formatNumber = (num: number): string => {
    const str = Math.ceil(num).toString();
    if (str.length <= 3) return str;
    let result = str.slice(-3);
    let remaining = str.slice(0, -3);
    while (remaining.length > 0) {
      result = remaining.slice(-2) + ',' + result;
      remaining = remaining.slice(0, -2);
    }
    return result;
  };

  // Show loading while fetching household or loading progress
  if (isLoadingProgress && incomeItems.length === 0) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-purple-800 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left Panel */}
      <div className="bg-gradient-to-br from-purple-800 to-purple-900 lg:w-1/2 xl:w-[55%] flex flex-col px-8 py-10 lg:px-12 lg:py-12 xl:px-16">
        {/* Header row with brand and sign-out (mobile) */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl text-white font-semibold">
            My<span className="font-bold">2Cents</span>
          </h1>
          {/* Sign out button - mobile only */}
          <button
            onClick={handleSignOutClick}
            className="lg:hidden flex items-center gap-1.5 text-xs text-white/60 hover:text-white transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span>Sign out</span>
          </button>
        </div>

        <div className="flex-1 flex flex-col justify-center py-8 lg:py-0">
          <div className="text-6xl mb-6 hidden lg:block">💰</div>
          <h2 className="text-3xl lg:text-4xl xl:text-5xl text-white leading-tight mb-4">
            <span className="lg:hidden">💰 </span>
            <span className="font-bold">Set up your budget</span>
          </h2>
          <p className="text-base text-white/60 max-w-lg mb-3">
            Enter your income amounts to plan your spending.
          </p>
          <p className="text-sm text-white/40 max-w-lg">
            Tip: Enter the amount that actually hits your account — that's what you'll budget with.
          </p>

          {totalMonthlyIncome > 0 && (
            <div className="hidden lg:block mt-8 p-4 bg-white/10 rounded-xl">
              <p className="text-white/60 text-sm mb-1">Total Monthly Income</p>
              <p className="text-white text-3xl font-bold">₹{formatNumber(totalMonthlyIncome)}</p>
            </div>
          )}
        </div>
      </div>

      {/* Right Panel */}
      <div className="flex-1 bg-stone-50 flex flex-col overflow-hidden">
        {/* Sign out button - desktop only */}
        <div className="hidden lg:flex justify-end px-4 pt-4 lg:px-8 lg:pt-6">
          <button
            onClick={handleSignOutClick}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span>Sign out</span>
          </button>
        </div>

        {/* Scrollable content area */}
        <div className="flex-1 overflow-y-auto px-8 lg:px-12 pb-4 pt-4">
          <div className="w-full max-w-lg mx-auto">
            <p className="text-sm text-gray-400 mb-2">Step 3 of 3 &bull; Income</p>

            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">
              How much do you earn?
            </h2>
            <p className="text-gray-500 text-sm mb-6">
              Click on a name to rename it &bull; You can add/update categories anytime
            </p>

            {/* Income items */}
            <div className="space-y-2 mb-3">
              {incomeItems.map((item, index) => (
                <AmountInput
                  key={item.id}
                  name={item.name}
                  icon={item.icon}
                  amount={item.amount}
                  period={item.period}
                  onAmountChange={(amount) => updateItem(item.id, { amount })}
                  onPeriodChange={(period) => updateItem(item.id, { period })}
                  onNameChange={(name) => updateItem(item.id, { name })}
                  onRemove={() => removeItem(item.id)}
                  autoFocus={index === 0}
                />
              ))}
            </div>

            {/* Inline add - Notion style */}
            <div className="relative">
              {showAddInput ? (
                <div className="relative">
                  <input
                    ref={addInputRef}
                    type="text"
                    value={addInputValue}
                    onChange={(e) => {
                      setAddInputValue(e.target.value);
                      setShowSuggestions(true);
                      setAddError(null); // Clear error on input change
                    }}
                    onKeyDown={handleAddKeyDown}
                    onBlur={() => {
                      // Delay to allow click on suggestion
                      setTimeout(() => {
                        setShowAddInput(false);
                        setAddInputValue('');
                        setShowSuggestions(false);
                        setAddError(null);
                      }, 150);
                    }}
                    placeholder="Type to add income source..."
                    className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-1 ${
                      addError
                        ? 'border-red-300 focus:border-red-500 focus:ring-red-100'
                        : 'border-gray-200 focus:border-purple-800 focus:ring-purple-100'
                    }`}
                  />

                  {/* Error message */}
                  {addError && (
                    <p className="text-red-500 text-xs mt-1">{addError}</p>
                  )}

                  {/* Suggestions dropdown */}
                  {showSuggestions && (suggestions.length > 0 || addInputValue.trim()) && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                      {suggestions.map(s => (
                        <button
                          key={s.id}
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            addFromSuggestion(s);
                          }}
                          className="w-full px-3 py-2 text-left text-sm hover:bg-purple-50 flex items-center gap-2"
                        >
                          <span>{s.icon}</span>
                          <span>{s.name}</span>
                        </button>
                      ))}
                      {addInputValue.trim() && !suggestions.find(s => s.name.toLowerCase() === addInputValue.trim().toLowerCase()) && (
                        <button
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            addCustom();
                          }}
                          className="w-full px-3 py-2 text-left text-sm hover:bg-purple-50 flex items-center gap-2 text-purple-700 border-t border-gray-100"
                        >
                          <span>+</span>
                          <span>Create "{addInputValue.trim()}"</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowAddInput(true)}
                  className="text-sm text-gray-400 hover:text-purple-600 transition-colors flex items-center gap-1"
                >
                  <span>+</span>
                  <span>Add income source</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Fixed bottom section */}
        <div className="border-t border-gray-200 bg-stone-50 px-8 lg:px-12 py-4">
          <div className="w-full max-w-lg mx-auto">
            {/* Mobile total */}
            {totalMonthlyIncome > 0 && (
              <div className="lg:hidden mb-4 p-3 bg-purple-50 border border-purple-100 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 text-sm">Monthly Income</span>
                  <span className="text-lg font-bold text-purple-800">₹{formatNumber(totalMonthlyIncome)}</span>
                </div>
              </div>
            )}

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                onClick={handleBack}
                className="px-5 py-3 border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleContinue}
                disabled={!allAmountsFilled}
                className="flex-1 py-3 px-6 bg-purple-800 text-white font-semibold rounded-xl hover:bg-purple-900 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Sign out confirmation modal */}
      {showSignOutModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl">
            <div className="text-center mb-6">
              <span className="text-5xl mb-4 block">😢</span>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Do you really want to go?
              </h3>
              <p className="text-gray-500 text-sm">
                Don't worry, all your progress has been saved. You can pick up right where you left off!
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowSignOutModal(false)}
                className="flex-1 px-4 py-3 border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSignOut}
                disabled={isSaving}
                className="flex-1 px-4 py-3 bg-purple-800 text-white font-semibold rounded-xl hover:bg-purple-900 disabled:bg-purple-400 transition-colors"
              >
                {isSaving ? 'Saving...' : 'Sign out'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
