import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { CategoryTile, AddCustomTile } from './CategoryTile';
import { getIncomeTemplates } from '../data/defaultCategories';
import type { SubCategoryTemplate } from '../types';
import { useAuth } from '../../../app/providers/AuthProvider';
import { getUserHousehold } from '../../onboarding/services/onboarding';

/**
 * Income Selection Screen (Step 3a)
 *
 * Users select their income sources from pre-defined tiles.
 * Salary is pre-selected by default.
 * Preserves state when navigating back from amounts screen.
 */
export function IncomeSelectionScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut } = useAuth();

  // Get household info from navigation state or fetch it
  const [householdId, setHouseholdId] = useState<string | undefined>(location.state?.householdId);
  const [householdName, setHouseholdName] = useState<string | undefined>(location.state?.householdName);
  const [isLoadingHousehold, setIsLoadingHousehold] = useState(!location.state?.householdId);

  // Fetch household if not in state (e.g., coming from login redirect)
  useEffect(() => {
    async function fetchHousehold() {
      if (householdId) return;

      try {
        const household = await getUserHousehold();
        if (household) {
          setHouseholdId(household.id);
          setHouseholdName(household.name);
        }
      } catch (e) {
        console.error('Error fetching household:', e);
      } finally {
        setIsLoadingHousehold(false);
      }
    }

    fetchHousehold();
  }, [householdId]);

  // Handle sign out
  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  // Check if we have previous selections (from back navigation)
  const previousSelections: SubCategoryTemplate[] = location.state?.previousSelections || [];
  const previousAllocations = location.state?.previousAllocations || {};

  // Get income templates
  const templates = getIncomeTemplates();

  // Initialize selections - restore from previous state or use defaults
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => {
    if (previousSelections.length > 0) {
      // Restore from back navigation - only include template IDs
      const ids = new Set<string>();
      previousSelections.forEach(s => {
        if (!s.id.startsWith('custom-')) {
          ids.add(s.id);
        }
      });
      return ids;
    }

    // Default: pre-select items marked as default
    const defaults = new Set<string>();
    templates.forEach(t => {
      if (t.is_default_selected) {
        defaults.add(t.id);
      }
    });
    return defaults;
  });

  // Custom items - restore from previous state or start empty
  const [customItems, setCustomItems] = useState<{ id: string; name: string; icon: string }[]>(() => {
    if (previousSelections.length > 0) {
      return previousSelections
        .filter(s => s.id.startsWith('custom-'))
        .map(s => ({
          id: s.id,
          name: s.name,
          icon: s.icon || '💵',
        }));
    }
    return [];
  });

  const [showAddCustom, setShowAddCustom] = useState(false);
  const [customName, setCustomName] = useState('');
  const [showSignOutModal, setShowSignOutModal] = useState(false);

  // Handle template toggle
  const toggleTemplate = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  // Handle custom item toggle (remove)
  const toggleCustom = (id: string) => {
    setCustomItems(prev => prev.filter(item => item.id !== id));
  };

  // Add custom income source
  const addCustomItem = () => {
    if (!customName.trim()) return;

    const newItem = {
      id: `custom-${Date.now()}`,
      name: customName.trim(),
      icon: '💵',
    };

    setCustomItems(prev => [...prev, newItem]);
    setCustomName('');
    setShowAddCustom(false);
  };

  // Get all selected items for navigation
  const getSelections = (): SubCategoryTemplate[] => {
    const fromTemplates = templates.filter(t => selectedIds.has(t.id));
    const fromCustom = customItems.map(item => ({
      id: item.id,
      category_id: 'income',
      name: item.name,
      icon: item.icon,
      is_default_selected: false,
      display_order: 99,
    }));
    return [...fromTemplates, ...fromCustom];
  };

  const selections = getSelections();
  const hasSelections = selections.length > 0;

  // Continue to income amounts screen
  const handleContinue = () => {
    navigate('/onboarding/budget/income-amounts', {
      state: {
        householdId,
        householdName,
        incomeSelections: selections,
        incomeAllocations: previousAllocations, // Preserve amounts when going forward again
      },
    });
  };

  // Show loading while fetching household
  if (isLoadingHousehold) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-purple-800 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left Panel - Branding */}
      <div className="bg-gradient-to-br from-purple-800 to-purple-900 lg:w-1/2 xl:w-[55%] flex flex-col px-8 py-10 lg:px-12 lg:py-12 xl:px-16">
        {/* Header row with brand and sign-out (mobile) */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl text-white font-semibold">
            My<span className="font-bold">2Cents</span>
          </h1>
          {/* Sign out button - mobile only */}
          <button
            onClick={() => setShowSignOutModal(true)}
            className="lg:hidden flex items-center gap-1.5 text-xs text-white/60 hover:text-white transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span>Sign out</span>
          </button>
        </div>

        <div className="flex-1 flex flex-col justify-center py-8 lg:py-0">
          {/* Desktop: emoji on separate line above title */}
          <div className="text-6xl mb-6 hidden lg:block">💰</div>
          {/* Title with inline emoji on mobile */}
          <h2 className="text-3xl lg:text-4xl xl:text-5xl text-white leading-tight mb-4">
            <span className="lg:hidden">💰 </span>
            <span className="font-bold">Set up your budget</span>
          </h2>
          <p className="text-base text-white/60 max-w-lg">
            Let's start with your income sources. This helps you plan how much you can spend each month.
          </p>
        </div>
      </div>

      {/* Right Panel - Selection */}
      <div className="flex-1 bg-stone-50 flex flex-col overflow-y-auto">
        {/* Sign out button - desktop only */}
        <div className="hidden lg:flex justify-end px-4 pt-4 lg:px-8 lg:pt-6">
          <button
            onClick={() => setShowSignOutModal(true)}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span>Sign out</span>
          </button>
        </div>

        <div className="flex-1 flex items-start lg:items-center justify-center px-8 lg:px-12 pb-8">
          <div className="w-full max-w-lg">
            <p className="text-sm text-gray-400 mb-2">Step 3 of 3 &bull; Income</p>

          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">
            What are your income sources?
          </h2>
          <p className="text-gray-500 text-sm mb-6">
            Select all that apply &bull; You can update this anytime
          </p>

          {/* Tile Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
            {templates.map(template => (
              <CategoryTile
                key={template.id}
                name={template.name}
                icon={template.icon}
                selected={selectedIds.has(template.id)}
                onToggle={() => toggleTemplate(template.id)}
              />
            ))}

            {/* Custom items */}
            {customItems.map(item => (
              <CategoryTile
                key={item.id}
                name={item.name}
                icon={item.icon}
                selected={true}
                onToggle={() => toggleCustom(item.id)}
              />
            ))}

            {/* Add Custom tile */}
            <AddCustomTile onClick={() => setShowAddCustom(true)} />
          </div>

          {/* Add Custom Modal/Inline Form */}
          {showAddCustom && (
            <div className="mb-6 p-4 bg-white border border-gray-200 rounded-xl">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Custom income source
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="e.g., Side hustle"
                  autoFocus
                  className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-purple-800 focus:ring-2 focus:ring-purple-100"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') addCustomItem();
                    if (e.key === 'Escape') setShowAddCustom(false);
                  }}
                />
                <button
                  onClick={addCustomItem}
                  disabled={!customName.trim()}
                  className="px-4 py-2.5 bg-purple-800 text-white font-medium rounded-lg hover:bg-purple-900 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  Add
                </button>
                <button
                  onClick={() => {
                    setShowAddCustom(false);
                    setCustomName('');
                  }}
                  className="px-4 py-2.5 border border-gray-200 text-gray-600 font-medium rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Continue Button */}
          <button
            onClick={handleContinue}
            disabled={!hasSelections}
            className="w-full py-3.5 px-6 bg-purple-800 text-white font-semibold rounded-xl hover:bg-purple-900 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            Continue
          </button>
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
                className="flex-1 px-4 py-3 bg-purple-800 text-white font-semibold rounded-xl hover:bg-purple-900 transition-colors"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
