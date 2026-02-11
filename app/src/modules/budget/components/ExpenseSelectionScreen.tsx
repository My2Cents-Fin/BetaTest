import { useNavigate, useLocation } from 'react-router-dom';

/**
 * Expense Selection Screen (Step 3c) - Placeholder
 *
 * TODO: Implement full expense selection with tiles
 */
export function ExpenseSelectionScreen() {
  const navigate = useNavigate();
  const location = useLocation();

  // Get data from navigation state
  const householdId = location.state?.householdId;
  const householdName = location.state?.householdName;
  const incomeSelections = location.state?.incomeSelections || [];
  const incomeAllocations = location.state?.incomeAllocations || {};
  const totalMonthlyIncome = location.state?.totalMonthlyIncome || 0;

  // Format number with Indian comma separators
  const formatNumber = (num: number): string => {
    const str = Math.round(num).toString();
    if (str.length <= 3) return str;
    let result = str.slice(-3);
    let remaining = str.slice(0, -3);
    while (remaining.length > 0) {
      result = remaining.slice(-2) + ',' + result;
      remaining = remaining.slice(0, -2);
    }
    return result;
  };

  // Go back to income amounts
  const handleBack = () => {
    navigate('/onboarding/budget/income-amounts', {
      state: {
        householdId,
        householdName,
        incomeSelections,
        incomeAllocations,
      },
    });
  };

  // Skip to dashboard for now (placeholder)
  const handleSkip = () => {
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left Panel - Branding */}
      <div className="bg-gradient-to-br from-purple-800 to-purple-900 lg:w-1/2 xl:w-[55%] flex flex-col px-8 py-10 lg:px-12 lg:py-12 xl:px-16">
        <h1 className="text-2xl text-white font-semibold">
          My<span className="font-bold">2Cents</span>
        </h1>

        <div className="flex-1 flex flex-col justify-center py-8 lg:py-0">
          <div className="text-6xl mb-6 hidden lg:block">💸</div>
          <h2 className="text-3xl lg:text-4xl xl:text-5xl text-white leading-tight mb-4">
            <span className="lg:hidden">💸 </span>
            <span className="font-bold">Set up your budget</span>
          </h2>
          <p className="text-base text-white/60 max-w-lg">
            Now let's plan your expenses.
          </p>

          {totalMonthlyIncome > 0 && (
            <div className="hidden lg:block mt-8 p-4 bg-white/10 rounded-xl">
              <p className="text-white/60 text-sm mb-1">Monthly Income</p>
              <p className="text-white text-3xl font-bold">₹{formatNumber(totalMonthlyIncome)}</p>
            </div>
          )}
        </div>
      </div>

      {/* Right Panel */}
      <div className="flex-1 bg-stone-50 flex items-center justify-center p-8 lg:p-12">
        <div className="w-full max-w-lg text-center">
          <p className="text-sm text-gray-400 mb-2">Step 3 of 3 &bull; Expenses</p>

          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">
            Expense Setup Coming Soon
          </h2>

          <p className="text-gray-500 mb-8">
            We're still building this part of the app. For now, you can skip ahead to your dashboard.
          </p>

          <div className="p-4 bg-green-50 border border-green-200 rounded-xl mb-8">
            <p className="text-green-800 font-medium">
              Your income has been saved!
            </p>
            <p className="text-green-600 text-sm mt-1">
              Monthly income: ₹{formatNumber(totalMonthlyIncome)}
            </p>
          </div>

          {/* Buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleBack}
              className="px-5 py-3 border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors"
            >
              Back
            </button>
            <button
              onClick={handleSkip}
              className="flex-1 py-3 px-6 bg-purple-800 text-white font-semibold rounded-xl hover:bg-purple-900 transition-colors"
            >
              Go to Dashboard
            </button>
          </div>

          <p className="text-xs text-gray-400 text-center mt-4">
            You can set up expenses later from Settings
          </p>
        </div>
      </div>
    </div>
  );
}
