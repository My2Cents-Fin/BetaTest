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
    <div className="min-h-screen bg-gradient-to-br from-green-600 to-green-700 flex flex-col items-center justify-center px-6 relative overflow-hidden">
      {/* Decorative circles */}
      <div className="absolute top-[20%] right-[-10%] w-[200px] h-[200px] bg-white/10 rounded-full" />
      <div className="absolute bottom-[10%] left-[-15%] w-[180px] h-[180px] bg-white/[0.08] rounded-full" />

      {/* Content */}
      <div className="relative z-10 text-center">
        {/* Success Icon */}
        <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-lg mb-6 mx-auto animate-scale-in">
          <span className="text-4xl text-green-600">✓</span>
        </div>

        <h1 className="text-2xl font-bold text-white text-center mb-2">
          You're in!
        </h1>
        <p className="text-base text-white/90 text-center">
          Phone verified successfully
        </p>
      </div>
    </div>
  );
}
