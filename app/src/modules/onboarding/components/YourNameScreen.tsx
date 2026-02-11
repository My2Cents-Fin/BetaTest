import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { validateName } from '../../../shared/utils/validation';
import { updateDisplayName } from '../services/onboarding';
import { useAuth } from '../../../app/providers/AuthProvider';

export function YourNameScreen() {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSignOutModal, setShowSignOutModal] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const validation = validateName(name);
  const isValid = validation.valid;

  const handleSubmit = async () => {
    if (!isValid) {
      setError(validation.error || 'Please enter a valid name');
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      const result = await updateDisplayName(validation.value!);

      if (!result.success) {
        setError(result.error || 'Failed to save name');
        return;
      }

      navigate('/onboarding/household');
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

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

        {/* Hero Text - vertically centered */}
        <div className="flex-1 flex flex-col justify-center py-8 lg:py-0">
          <div className="text-6xl mb-6">👋</div>
          <h2 className="text-3xl lg:text-4xl xl:text-5xl text-white leading-tight mb-4">
            <span className="font-bold">Let's get to know you</span>
          </h2>
          <p className="text-base text-white/60 max-w-lg">
            We'll personalize your experience based on your preferences.
          </p>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex-1 bg-stone-50 flex flex-col">
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

        <div className="flex-1 flex items-center justify-center px-8 lg:px-12 pb-8">
          <div className="w-full max-w-md">
            {/* Step indicator */}
            <p className="text-sm text-gray-400 mb-2">Step 1 of 2</p>

          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            What should we call you?
          </h2>
          <p className="text-gray-500 mb-8">
            Just your first name is fine
          </p>

          {/* Form */}
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Your Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (error) setError('');
                }}
                placeholder="e.g., John"
                autoCapitalize="words"
                autoComplete="given-name"
                disabled={isLoading}
                className={`
                  w-full px-4 py-3.5 border rounded-xl text-gray-900 bg-white
                  placeholder:text-gray-400
                  focus:outline-none focus:border-purple-800 focus:ring-2 focus:ring-purple-100
                  disabled:opacity-50 disabled:cursor-not-allowed
                  ${error ? 'border-red-500' : 'border-gray-200'}
                `}
              />
              {error && (
                <p className="mt-2 text-sm text-red-500">{error}</p>
              )}
            </div>

            <button
              onClick={handleSubmit}
              disabled={!isValid || isLoading}
              className="w-full py-3.5 px-6 bg-purple-800 text-white font-semibold rounded-xl hover:bg-purple-900 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Saving...
                </span>
              ) : (
                'Continue'
              )}
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
