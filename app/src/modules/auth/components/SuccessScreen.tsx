import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export function SuccessScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const isNewUser = (location.state as { isNewUser?: boolean })?.isNewUser ?? true;

  useEffect(() => {
    // Auto-navigate after 1.5 seconds
    const timer = setTimeout(() => {
      if (isNewUser) {
        navigate('/onboarding/name', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [isNewUser, navigate]);

  return (
    <div className="min-h-screen bg-primary-gradient flex flex-col items-center justify-center px-6 relative overflow-hidden">
      {/* Decorative circles */}
      <div className="absolute top-[20%] right-[-10%] w-[200px] h-[200px] bg-white/[0.06] rounded-full" />
      <div className="absolute bottom-[10%] left-[-15%] w-[180px] h-[180px] bg-white/[0.04] rounded-full" />

      {/* Content */}
      <div className="relative z-10 text-center">
        {/* Success Icon */}
        <div className="w-24 h-24 bg-white/90 backdrop-blur-xl rounded-3xl flex items-center justify-center shadow-[0_8px_32px_rgba(0,0,0,0.1)] mb-6 mx-auto animate-scale-in">
          <svg className="w-12 h-12 text-[var(--color-success)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-white text-center mb-2">
          You're in!
        </h1>
        <p className="text-base text-white/80 text-center">
          Phone verified successfully
        </p>
      </div>
    </div>
  );
}
