import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { markOnboardingComplete } from '../../auth/services/auth';
import { isQREnabled } from '../../../config/app.config';

export function InviteScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const { inviteCode } = (location.state as { householdId?: string; inviteCode?: string }) || {};

  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Generate invite URL - use network IP if on localhost for local testing
  const getBaseUrl = () => {
    const { hostname, port, protocol } = window.location;
    // If localhost, try to use a shareable URL hint
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      // For local dev, construct with current hostname (user should use network IP)
      return `${protocol}//${hostname}:${port}`;
    }
    return window.location.origin;
  };
  const baseUrl = getBaseUrl();
  const inviteUrl = `${baseUrl}/join/${inviteCode || 'demo'}`;
  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = inviteUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleContinue = async () => {
    setIsLoading(true);
    try {
      await markOnboardingComplete();
      navigate('/dashboard', { replace: true });
    } catch {
      navigate('/dashboard', { replace: true });
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left Panel - Branding */}
      <div className="bg-primary-gradient lg:w-1/2 xl:w-[55%] flex flex-col px-8 py-10 lg:px-12 lg:py-12 xl:px-16 relative overflow-hidden">
        {/* Decorative shapes */}
        <div className="absolute top-[15%] right-[-8%] w-[200px] h-[200px] bg-white/[0.06] rounded-full" />
        <div className="absolute bottom-[10%] left-[-10%] w-[160px] h-[160px] bg-white/[0.04] rounded-full" />

        {/* Brand Name */}
        <h1 className="text-2xl text-white font-semibold relative z-10">
          My<span className="font-bold">2Cents</span>
        </h1>

        {/* Hero Text - vertically centered */}
        <div className="flex-1 flex flex-col justify-center py-8 lg:py-0 relative z-10">
          <div className="text-6xl mb-6">🤝</div>
          <h2 className="text-3xl lg:text-4xl xl:text-5xl text-white leading-tight mb-4">
            <span className="font-bold">Money is better managed together</span>
          </h2>
          <p className="text-base text-white/60 max-w-lg">
            Invite family, friends, or roommates to join your household and stay on top of shared finances.
          </p>
        </div>
      </div>

      {/* Right Panel - Content */}
      <div className="flex-1 bg-[var(--color-page-bg)] flex items-center justify-center p-8 lg:p-12">
        <div className="w-full max-w-md">
          {/* Step indicator */}
          <p className="text-sm text-gray-400 mb-2">Step 3 of 3</p>

          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Invite others
          </h2>
          <p className="text-gray-500 mb-8">
            Share this code or link with anyone you want to add
          </p>

          {/* Invite Code Display */}
          <div className="glass-card p-6 mb-6">
            {/* Show invite code prominently */}
            <div className="text-center mb-4">
              <p className="text-sm text-gray-500 mb-2">Your invite code</p>
              <div className="bg-[var(--color-primary-bg)] border-2 border-[var(--color-primary)]/20 rounded-xl py-3 px-4">
                <span className="text-2xl font-mono font-bold text-[var(--color-primary)] tracking-widest">
                  {inviteCode || 'DEMO'}
                </span>
              </div>
            </div>

            {/* QR Code - only when config allows */}
            {isQREnabled() && (
              <>
                {isLocalhost && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
                    <p className="text-xs text-amber-700 text-center">
                      <span className="font-semibold">Local testing:</span> QR code uses localhost.
                      Share the invite code above instead, or access this app using your network IP (192.168.x.x:5173).
                    </p>
                  </div>
                )}

                <div className="flex justify-center mb-4">
                  <div className="bg-white p-3 rounded-lg border border-gray-100">
                    <QRCodeSVG
                      value={inviteUrl}
                      size={140}
                      level="M"
                      includeMargin={false}
                      bgColor="#ffffff"
                      fgColor="#6b21a8"
                    />
                  </div>
                </div>

                {!isLocalhost && (
                  <p className="text-sm text-gray-500 text-center mb-4">
                    Scan to join your household
                  </p>
                )}

                <div className="flex items-center gap-3 mb-4">
                  <div className="flex-1 h-px bg-gray-200" />
                  <span className="text-sm text-gray-400">or</span>
                  <div className="flex-1 h-px bg-gray-200" />
                </div>
              </>
            )}

            <button
              onClick={handleCopyLink}
              className="w-full py-3 px-4 border border-[var(--color-primary)] text-[var(--color-primary)] font-semibold rounded-xl hover:bg-[var(--color-primary-bg)] transition-colors"
            >
              {copied ? '✓ Link Copied!' : 'Copy Invite Link'}
            </button>

            <p className="text-xs text-gray-400 text-center mt-3">
              Share via WhatsApp, SMS, or any messaging app
            </p>
          </div>

          {/* Continue Button */}
          <button
            onClick={handleContinue}
            disabled={isLoading}
            className="w-full py-3.5 px-6 bg-primary-gradient text-white font-semibold rounded-xl shadow-[0_4px_16px_rgba(124,58,237,0.3)] hover:shadow-[0_6px_20px_rgba(124,58,237,0.4)] hover:-translate-y-0.5 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed disabled:shadow-none disabled:translate-y-0 transition-all"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Loading...
              </span>
            ) : (
              'Continue to Dashboard'
            )}
          </button>

          <p className="text-xs text-gray-400 text-center mt-3">
            You can always invite others later from Settings
          </p>
        </div>
      </div>
    </div>
  );
}
