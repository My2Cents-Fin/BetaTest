import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { OTPInput } from './OTPInput';
import { signUpWithPin, resetPin, getOnboardingStatus } from '../services/auth';
import { validatePin } from '../../../shared/utils/validation';
import { Toast } from '../../../shared/components/Toast';

interface LocationState {
  phone?: string;
  isReset?: boolean;
  consentAccepted?: boolean;
}

export function SetPinScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const { phone, isReset, consentAccepted } = (location.state as LocationState) || {};

  const [step, setStep] = useState<1 | 2>(1);
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showToast, setShowToast] = useState(false);

  // Redirect if no phone in state
  useEffect(() => {
    if (!phone) {
      navigate('/login', { replace: true });
    }
  }, [phone, navigate]);

  const handlePinComplete = (value: string) => {
    if (step === 1) {
      // Validate PIN strength
      const validation = validatePin(value);
      if (!validation.valid) {
        setError(validation.error || 'Invalid PIN');
        setPin('');
        return;
      }
      setError('');
      setPin(value);
      setStep(2);
    } else {
      // Step 2: confirm
      setConfirmPin(value);
      handleConfirm(value);
    }
  };

  const handleConfirm = async (confirmValue: string) => {
    if (confirmValue !== pin) {
      setError('PINs don\'t match. Please try again.');
      setConfirmPin('');
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      if (isReset) {
        // Reset PIN flow
        const result = await resetPin(phone!, pin);
        if (!result.success) {
          setError(result.error || 'Failed to reset PIN.');
          setIsLoading(false);
          return;
        }
        setShowToast(true);
        setTimeout(() => {
          navigate('/enter-pin', { state: { phone }, replace: true });
        }, 1000);
      } else {
        // New user signup flow
        const result = await signUpWithPin(phone!, pin);
        if (!result.success) {
          setError(result.error || 'Sign up failed.');
          setIsLoading(false);
          return;
        }

        setShowToast(true);
        const status = await getOnboardingStatus();
        setTimeout(() => {
          navigate(status.nextRoute, {
            replace: true,
            state: consentAccepted ? { consentAccepted: true } : undefined,
          });
        }, 1000);
      }
    } catch {
      setError('Something went wrong. Please try again.');
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    if (step === 2) {
      setStep(1);
      setPin('');
      setConfirmPin('');
      setError('');
    } else if (isReset) {
      navigate('/enter-pin', { state: { phone } });
    } else {
      navigate('/login');
    }
  };

  return (
    <>
      {showToast && (
        <Toast
          message={isReset ? 'PIN reset successfully!' : 'Account created!'}
          type="success"
          onClose={() => setShowToast(false)}
        />
      )}

      <div className="min-h-[100dvh] flex flex-col lg:flex-row">
        {/* Left Panel - Branding */}
        <div className="bg-primary-gradient lg:w-1/2 xl:w-[55%] flex flex-col px-8 py-10 lg:px-12 lg:py-12 xl:px-16 relative overflow-hidden">
          <div className="absolute top-[15%] right-[-8%] w-[200px] h-[200px] bg-white/[0.06] rounded-full" />
          <div className="absolute bottom-[10%] left-[-10%] w-[160px] h-[160px] bg-white/[0.04] rounded-full" />

          <h1 className="text-2xl text-white font-semibold relative z-10">
            My<span className="font-bold">2Cents</span>
          </h1>

          <div className="flex-1 flex flex-col justify-center py-8 lg:py-0 relative z-10">
            <h2 className="text-3xl lg:text-4xl xl:text-5xl text-white leading-tight mb-4">
              <span className="font-bold">Manage money together,</span>{' '}
              <em className="font-light">effortlessly.</em>
            </h2>
            <p className="text-base text-white/60 max-w-lg">
              Track household expenses, plan budgets, and stay on top of your finances as a team.
            </p>
          </div>
        </div>

        {/* Right Panel - Form */}
        <div className="flex-1 bg-[var(--color-page-bg)] flex items-center justify-center p-8 lg:p-12">
          <div className="w-full max-w-md">
            {/* Back Button - desktop */}
            <button
              onClick={handleBack}
              className="hidden lg:flex items-center gap-1 text-sm font-medium text-gray-500 mb-6 hover:text-[var(--color-primary)] transition-colors"
            >
              ← Back
            </button>

            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              {step === 1
                ? (isReset ? 'Reset your PIN' : 'Create your PIN')
                : 'Confirm your PIN'}
            </h2>
            <p className="text-gray-500 mb-8">
              {step === 1
                ? 'Set a 6-digit PIN to secure your account'
                : 'Enter the same PIN again to confirm'}
            </p>

            {/* Error Alert */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                {error}
              </div>
            )}

            {/* PIN Input */}
            <div className="mb-8">
              {step === 1 ? (
                <OTPInput
                  key="pin-step-1"
                  value={pin}
                  onChange={(value) => {
                    setPin(value);
                    if (error) setError('');
                  }}
                  onComplete={handlePinComplete}
                  masked
                  disabled={isLoading}
                />
              ) : (
                <OTPInput
                  key="pin-step-2"
                  value={confirmPin}
                  onChange={(value) => {
                    setConfirmPin(value);
                    if (error) setError('');
                  }}
                  onComplete={handlePinComplete}
                  error={!!error}
                  masked
                  disabled={isLoading}
                />
              )}
            </div>

            {/* Step indicator */}
            <div className="flex justify-center gap-2 mb-6">
              <div className={`w-2 h-2 rounded-full ${step === 1 ? 'bg-[var(--color-primary)]' : 'bg-gray-300'}`} />
              <div className={`w-2 h-2 rounded-full ${step === 2 ? 'bg-[var(--color-primary)]' : 'bg-gray-300'}`} />
            </div>

            {isLoading && (
              <div className="flex items-center justify-center gap-2 text-gray-500 text-sm">
                <span className="w-5 h-5 border-2 border-[var(--color-primary)]/30 border-t-[var(--color-primary)] rounded-full animate-spin" />
                {isReset ? 'Resetting PIN...' : 'Creating account...'}
              </div>
            )}

            {/* Back button - mobile */}
            <button
              onClick={handleBack}
              className="lg:hidden w-full mt-4 py-3 text-sm font-medium text-gray-500 hover:text-[var(--color-primary)] transition-colors"
            >
              ← {step === 2 ? 'Back' : (isReset ? 'Back to login' : 'Change phone number')}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
