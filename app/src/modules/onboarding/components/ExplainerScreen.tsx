import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUserHousehold } from '../services/onboarding';
import { createDefaultExpenseTemplate } from '../../budget/services/budget';

export function ExplainerScreen() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const handlePlanBudget = () => {
    navigate('/dashboard?tab=budget', { replace: true });
  };

  const handleSkipToTrack = async () => {
    setIsLoading(true);
    try {
      // Get household (just created in previous step)
      const household = await getUserHousehold();
      if (household) {
        // Auto-load 8 default subcategories so tracking mode has categories ready
        await createDefaultExpenseTemplate(household.id);
      }
      navigate('/dashboard', { replace: true });
    } catch (e) {
      console.error('Error in skip flow:', e);
      // Navigate anyway — defaults can be created later by BudgetTab
      navigate('/dashboard', { replace: true });
    }
  };

  const steps = [
    {
      num: '1',
      title: 'Plan your monthly budget',
      desc: "Set spending limits for each category \u2014 we'll track how you're doing against them.",
    },
    {
      num: '2',
      title: 'Record daily expenses',
      desc: 'Add transactions as you spend. Takes 10 seconds each.',
    },
    {
      num: '3',
      title: 'Stay on track together',
      desc: 'Both you and your partner see the same picture. No surprises.',
    },
  ];

  return (
    <div className="min-h-[100dvh] flex flex-col lg:flex-row">
      {/* Left Panel - Branding */}
      <div className="bg-primary-gradient relative overflow-hidden lg:w-1/2 xl:w-[55%] flex flex-col px-8 py-10 lg:px-12 lg:py-12 xl:px-16">
        <h1 className="text-2xl text-white font-semibold">
          My<span className="font-bold">2Cents</span>
        </h1>

        <div className="flex-1 flex flex-col justify-center py-8 lg:py-0">
          <div className="text-6xl mb-6 hidden lg:block">🎉</div>
          <h2 className="text-3xl lg:text-4xl xl:text-5xl text-white leading-tight mb-4">
            <span className="lg:hidden">🎉 </span>
            <span className="font-bold">Welcome to My2Cents!</span>
          </h2>
          <p className="text-base text-white/60 max-w-lg">
            Your household is ready. Here's how the app works.
          </p>
        </div>
      </div>

      {/* Right Panel - Steps & CTAs */}
      <div className="flex-1 bg-[var(--color-page-bg)] flex flex-col">
        <div className="flex-1 flex items-center justify-center px-8 lg:px-12 pb-8">
          <div className="w-full max-w-md">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
              Here's how it works
            </h2>
            <p className="text-gray-500 mb-8">Three simple steps to manage your money together</p>

            {/* Steps */}
            <div className="space-y-5 mb-10">
              {steps.map(step => (
                <div key={step.num} className="flex gap-4">
                  <div className="w-9 h-9 rounded-xl bg-primary-gradient flex items-center justify-center flex-shrink-0 shadow-[0_2px_8px_rgba(124,58,237,0.25)]">
                    <span className="text-white text-sm font-bold">{step.num}</span>
                  </div>
                  <div className="flex-1 pt-0.5">
                    <h3 className="text-sm font-semibold text-gray-900 mb-0.5">{step.title}</h3>
                    <p className="text-sm text-gray-500 leading-relaxed">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* CTAs */}
            <div className="space-y-3">
              <button
                onClick={handlePlanBudget}
                disabled={isLoading}
                className="w-full py-3.5 px-6 bg-primary-gradient text-white font-semibold rounded-xl shadow-[0_4px_16px_rgba(124,58,237,0.3)] hover:shadow-[0_6px_20px_rgba(124,58,237,0.4)] hover:-translate-y-0.5 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                Let's Plan My Budget
              </button>

              <button
                onClick={handleSkipToTrack}
                disabled={isLoading}
                className="w-full py-3 px-6 text-[var(--color-primary)] text-sm font-medium hover:bg-[var(--color-primary-bg)] rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-[var(--color-primary)]/30 border-t-[var(--color-primary)] rounded-full animate-spin" />
                    Setting up...
                  </span>
                ) : (
                  <>Skip, I'll start by tracking →</>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
