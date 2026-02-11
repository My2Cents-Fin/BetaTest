import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PhoneInput } from './PhoneInput';
import { validatePhone } from '../../../shared/utils/validation';
import { sendOTP } from '../services/auth';

export function PhoneEntryScreen() {
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const validation = validatePhone(phone);
  const isValid = validation.valid;

  const handleSubmit = async () => {
    if (!isValid) {
      setError(validation.error || 'Invalid phone number');
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      const result = await sendOTP(validation.value!);
      if (result.error) {
        setError(result.error);
        return;
      }
      navigate('/verify', { state: { phone: validation.value } });
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && isValid && !isLoading) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row overflow-x-hidden">
      {/* Left Panel - Branding */}
      <div className="bg-gradient-to-br from-purple-800 to-purple-900 w-full lg:w-1/2 xl:w-[55%] flex flex-col px-8 py-10 lg:px-12 lg:py-12 xl:px-16 shrink-0">
        {/* Brand Name */}
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
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome!
          </h2>
          <p className="text-gray-500 mb-8">
            Enter your phone number to get started
          </p>

          <div className="space-y-6">
            <PhoneInput
              value={phone}
              onChange={(value) => {
                setPhone(value);
                if (error) setError('');
              }}
              onKeyDown={handleKeyDown}
              error={error}
              disabled={isLoading}
            />

            <button
              onClick={handleSubmit}
              disabled={!isValid || isLoading}
              className="w-full py-3.5 px-6 bg-purple-800 text-white font-semibold rounded-xl hover:bg-purple-900 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Sending...
                </span>
              ) : (
                'Continue'
              )}
            </button>
          </div>

          <p className="mt-8 text-center text-sm text-gray-400">
            By continuing, you agree to our{' '}
            <a href="#" className="text-purple-800 hover:underline">Terms</a>
            {' & '}
            <a href="#" className="text-purple-800 hover:underline">Privacy Policy</a>
          </p>
        </div>
      </div>
    </div>
  );
}
