import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { OTPInput } from './OTPInput';
import { verifyOTP, sendOTP, getOnboardingStatus } from '../services/auth';
import { Toast } from '../../../shared/components/Toast';

const RESEND_COOLDOWN = 30;
const MAX_RESEND_ATTEMPTS = 3;

export function OTPScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const phone = (location.state as { phone?: string })?.phone;

  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [showToast, setShowToast] = useState(false);

  // Resend state
  const [resendTimer, setResendTimer] = useState(RESEND_COOLDOWN);
  const [resendAttempts, setResendAttempts] = useState(0);

  // Redirect if no phone
  useEffect(() => {
    if (!phone) {
      navigate('/login', { replace: true });
    }
  }, [phone, navigate]);

  // Countdown timer
  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer((t) => t - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);

  const formatPhone = (p: string) => {
    // +919876543210 -> +91 98765 43210
    const digits = p.replace(/\D/g, '');
    if (digits.length === 12) {
      return `+${digits.slice(0, 2)} ${digits.slice(2, 7)} ${digits.slice(7)}`;
    }
    return p;
  };

  const handleVerify = async (otpValue?: string) => {
    const otpToVerify = otpValue || otp;

    if (otpToVerify.length !== 6) {
      return;
    }

    setError('');
    setIsError(false);
    setIsLoading(true);

    try {
      const result = await verifyOTP(phone!, otpToVerify);

      if (!result.success) {
        setError(result.error || 'Incorrect code. Please try again.');
        setIsError(true);
        setOtp('');
        setIsLoading(false);
        return;
      }

      // Show toast and navigate based on onboarding status
      setShowToast(true);

      // Get onboarding status to determine where to go
      const status = await getOnboardingStatus();

      // Navigate after a short delay for toast visibility
      setTimeout(() => {
        navigate(status.nextRoute, { replace: true });
      }, 1000);
    } catch {
      setError('Something went wrong. Please try again.');
      setIsError(true);
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendTimer > 0 || resendAttempts >= MAX_RESEND_ATTEMPTS) {
      return;
    }

    setError('');
    setIsError(false);

    try {
      const result = await sendOTP(phone!);

      if (result.error) {
        setError(result.error);
        return;
      }

      setResendAttempts((a) => a + 1);
      setResendTimer(RESEND_COOLDOWN);
      setOtp('');
    } catch {
      setError('Failed to resend code. Please try again.');
    }
  };

  const handleBack = () => {
    navigate('/login');
  };

  const canResend = resendTimer === 0 && resendAttempts < MAX_RESEND_ATTEMPTS;
  const isLocked = resendAttempts >= MAX_RESEND_ATTEMPTS;

  return (
    <>
      {/* Success Toast */}
      {showToast && (
        <Toast
          message="Phone verified successfully!"
          type="success"
          onClose={() => setShowToast(false)}
        />
      )}

      <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left Panel - Branding */}
      <div className="bg-gradient-to-br from-purple-800 to-purple-900 lg:w-1/2 xl:w-[55%] flex flex-col px-8 py-10 lg:px-12 lg:py-12 xl:px-16">
        {/* Header with brand */}
        <h1 className="text-2xl text-white font-semibold">
          My<span className="font-bold">2Cents</span>
        </h1>

        {/* Hero Text - vertically centered */}
        <div className="flex-1 flex flex-col justify-center py-8 lg:py-0">
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
      <div className="flex-1 bg-stone-50 flex items-center justify-center p-8 lg:p-12">
        <div className="w-full max-w-md">
          {/* Back Button - desktop only */}
          <button
            onClick={handleBack}
            className="hidden lg:flex items-center gap-1 text-sm font-medium text-gray-500 mb-6 hover:text-purple-800 transition-colors"
          >
            ← Back
          </button>

          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Verify OTP
          </h2>
          <p className="text-gray-500 mb-8">
            Enter the 6-digit code sent to{' '}
            <span className="font-medium text-gray-900">
              {phone ? formatPhone(phone) : ''}
            </span>
          </p>

          {/* Error Alert */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* OTP Input */}
          <div className="mb-6">
            <OTPInput
              value={otp}
              onChange={(value) => {
                setOtp(value);
                if (isError) {
                  setIsError(false);
                  setError('');
                }
              }}
              onComplete={handleVerify}
              error={isError}
              disabled={isLoading}
            />
          </div>

          {/* Resend */}
          <p className="text-sm text-gray-500 text-center mb-6">
            {isLocked ? (
              <span className="text-red-500">Too many attempts. Try again later.</span>
            ) : resendTimer > 0 ? (
              <>
                Didn't receive code?{' '}
                <span className="text-purple-800 font-semibold">
                  Resend in 0:{resendTimer.toString().padStart(2, '0')}
                </span>
              </>
            ) : (
              <>
                Didn't receive code?{' '}
                <button
                  onClick={handleResend}
                  disabled={!canResend}
                  className="text-purple-800 font-semibold hover:underline disabled:opacity-50"
                >
                  Resend OTP
                </button>
              </>
            )}
          </p>

          <button
            onClick={() => handleVerify()}
            disabled={otp.length !== 6 || isLoading}
            className="w-full py-3.5 px-6 bg-purple-800 text-white font-semibold rounded-xl hover:bg-purple-900 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Verifying...
              </span>
            ) : (
              'Verify'
            )}
          </button>

          {/* Back button - mobile only, below CTA */}
          <button
            onClick={handleBack}
            className="lg:hidden w-full mt-4 py-3 text-sm font-medium text-gray-500 hover:text-purple-800 transition-colors"
          >
            ← Back to login
          </button>
        </div>
      </div>
    </div>
    </>
  );
}
