import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../app/providers/AuthProvider';
import { getUserHousehold } from '../services/onboarding';
import { createDefaultExpenseTemplate } from '../../budget/services/budget';

export function ExplainerScreen() {
  const navigate = useNavigate();
  const { markAsOnboarded } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  // Mark as onboarded immediately so dashboard guard works when user clicks a CTA
  useEffect(() => {
    markAsOnboarded();
  }, [markAsOnboarded]);

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
      emoji: '📋',
      title: 'Plan',
      desc: 'Set monthly spending limits',
    },
    {
      emoji: '💸',
      title: 'Track',
      desc: 'Log expenses in 10 seconds',
    },
    {
      emoji: '👫',
      title: 'Together',
      desc: 'One household, no surprises',
    },
  ];

  return (
    <div className="min-h-[100dvh] flex flex-col bg-[var(--color-page-bg)]">
      {/* Purple hero — tall, contains success + heading + subtitle */}
      <div className="bg-primary-gradient px-6 pt-10 pb-10 rounded-b-[2rem] text-center">
        <div className="flex items-center justify-center gap-2 mb-5">
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-base">
            ✓
          </div>
          <span className="text-white/80 text-sm font-medium">You're all set!</span>
        </div>
        <h1 className="text-white font-bold text-2xl leading-snug mb-2">
          Three steps. That's it.
        </h1>
        <p className="text-white/70 text-sm leading-relaxed">
          Plan once, track daily.
          <br />
          Never wonder where the money went.
        </p>
      </div>

      {/* Main content — tight gap, CTAs toward thumb zone */}
      <div className="flex-1 flex flex-col justify-end px-6 pb-10 pt-4 lg:justify-center lg:py-12">
        <div className="w-full max-w-sm mx-auto">
          {/* Step cards */}
          <div className="space-y-3 mb-8">
            {steps.map((step, i) => (
              <div
                key={i}
                className="flex items-center gap-4 p-4 rounded-2xl bg-white/70 backdrop-blur-sm border border-[rgba(124,58,237,0.08)] shadow-[0_2px_8px_rgba(0,0,0,0.04)]"
              >
                <div className="text-4xl flex-shrink-0">{step.emoji}</div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-bold text-gray-900">{step.title}</h3>
                  <p className="text-sm text-gray-500">{step.desc}</p>
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
              Plan My Budget
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
                <>Skip, I'll just track expenses →</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
