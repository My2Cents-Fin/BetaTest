import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import { validateHouseholdName } from '../../../shared/utils/validation';
import { createHousehold, joinHousehold } from '../services/onboarding';
import { isQRScanningAvailable } from '../../../config/app.config';
import { useAuth } from '../../../app/providers/AuthProvider';
import { markOnboardingComplete } from '../../auth/services/auth';

type Mode = 'create' | 'join';

export function HouseholdScreen() {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [mode, setMode] = useState<Mode>('create');
  const [showSignOutModal, setShowSignOutModal] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  // Create mode state
  const [name, setName] = useState('');

  // Join mode state
  const [inviteCode, setInviteCode] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  // Shared state
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const validation = validateHouseholdName(name);
  const isCreateValid = validation.valid;
  const isJoinValid = inviteCode.trim().length >= 6;

  // Check if QR scanning is available (uses config + HTTPS + mobile detection)
  const canScanQR = isQRScanningAvailable();

  // Cleanup scanner on unmount
  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, []);

  const handleCreate = async () => {
    if (!isCreateValid) {
      setError(validation.error || 'Please enter a valid name');
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      const result = await createHousehold(validation.value!);

      if (!result.success) {
        setError(result.error || 'Failed to create household');
        return;
      }

      // Mark onboarding complete
      await markOnboardingComplete();

      // Always go to budget tab to create first budget (both mobile and desktop)
      navigate('/dashboard?tab=budget', { replace: true });
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoin = async (code?: string) => {
    const codeToUse = code || inviteCode.trim().toUpperCase();

    if (codeToUse.length < 6) {
      setError('Please enter a valid invite code');
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      const result = await joinHousehold(codeToUse);

      if (!result.success) {
        setError(result.error || 'Invalid invite code');
        setIsLoading(false);
        return;
      }

      // Mark onboarding complete
      await markOnboardingComplete();

      // Always go to budget tab to create first budget (both mobile and desktop)
      navigate('/dashboard?tab=budget', { replace: true });
    } catch {
      setError('Something went wrong. Please try again.');
      setIsLoading(false);
    }
  };

  const startScanner = async () => {
    setError('');

    // Check if we're on a secure context (HTTPS or localhost)
    if (!window.isSecureContext) {
      setError('Camera requires a secure connection (HTTPS). Please enter the code manually.');
      return;
    }

    // Check if camera API is available
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError('Camera not supported on this browser. Please enter the code manually.');
      return;
    }

    // Request camera permission first
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      // Stop the stream immediately - we just needed to trigger the permission
      stream.getTracks().forEach(track => track.stop());
    } catch (permErr: unknown) {
      console.error('Camera permission error:', permErr);
      const error = permErr as { name?: string };
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        setError('Camera access denied. Please enable camera permission in your browser settings and try again.');
      } else if (error.name === 'NotFoundError') {
        setError('No camera found on this device. Please enter the code manually.');
      } else {
        setError('Could not access camera. Please enter the code manually.');
      }
      return;
    }

    setIsScanning(true);

    try {
      const scanner = new Html5Qrcode('qr-reader');
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          // Extract invite code from URL or use as-is
          let code = decodedText;

          // If it's a URL, extract the code
          const joinMatch = decodedText.match(/\/join\/([a-zA-Z0-9]+)/);
          if (joinMatch) {
            code = joinMatch[1];
          }

          // Stop scanner and join
          scanner.stop().then(() => {
            setIsScanning(false);
            setInviteCode(code);
            handleJoin(code);
          });
        },
        () => {
          // Ignore scan errors (no QR found yet)
        }
      );
    } catch (err) {
      console.error('Scanner error:', err);
      setError('Could not start camera. Please enter the code manually.');
      setIsScanning(false);
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      await scannerRef.current.stop().catch(() => {});
      scannerRef.current = null;
    }
    setIsScanning(false);
  };

  return (
    <div className="min-h-[100dvh] flex flex-col lg:flex-row">
      {/* Left Panel - Branding */}
      <div className="bg-primary-gradient relative overflow-hidden lg:w-1/2 xl:w-[55%] flex flex-col px-8 py-10 lg:px-12 lg:py-12 xl:px-16">
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

        <div className="flex-1 flex flex-col justify-center py-8 lg:py-0">
          {/* Desktop: emoji on separate line above title */}
          <div className="text-6xl mb-6 hidden lg:block">🏠</div>
          {/* Title with inline emoji on mobile */}
          <h2 className="text-3xl lg:text-4xl xl:text-5xl text-white leading-tight mb-4">
            <span className="lg:hidden">🏠 </span>
            <span className="font-bold">
              {mode === 'create' ? 'Create your household' : 'Join a household'}
            </span>
          </h2>
          <p className="text-base text-white/60 max-w-lg">
            A household is your shared budget space — for family, for couples, for friends, or anyone you manage money with.
          </p>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex-1 bg-[var(--color-page-bg)] flex flex-col">
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
            <p className="text-sm text-gray-400 mb-2">Step 2 of 2</p>

          {/* Mode Toggle */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => { setMode('create'); setError(''); }}
              className={`flex-1 py-2.5 px-4 rounded-xl font-medium text-sm transition-all ${
                mode === 'create'
                  ? 'bg-primary-gradient text-white shadow-[0_2px_8px_rgba(124,58,237,0.25)]'
                  : 'bg-white/60 text-gray-600 border border-[rgba(124,58,237,0.1)] hover:bg-white/80'
              }`}
            >
              Create New
            </button>
            <button
              onClick={() => { setMode('join'); setError(''); }}
              className={`flex-1 py-2.5 px-4 rounded-xl font-medium text-sm transition-all ${
                mode === 'join'
                  ? 'bg-primary-gradient text-white shadow-[0_2px_8px_rgba(124,58,237,0.25)]'
                  : 'bg-white/60 text-gray-600 border border-[rgba(124,58,237,0.1)] hover:bg-white/80'
              }`}
            >
              Join Existing
            </button>
          </div>

          {mode === 'create' ? (
            <>
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                Name your household
              </h2>
              <p className="text-gray-500 mb-8">
                This helps identify your shared finances
              </p>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Household Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (error) setError('');
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && isCreateValid && !isLoading) {
                        e.preventDefault();
                        handleCreate();
                      }
                    }}
                    placeholder="e.g., Sharma Family"
                    autoCapitalize="words"
                    disabled={isLoading}
                    className={`
                      w-full px-4 py-3.5 border rounded-xl text-gray-900 bg-white
                      placeholder:text-gray-400
                      focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[rgba(124,58,237,0.15)]
                      disabled:opacity-50 disabled:cursor-not-allowed
                      ${error ? 'border-red-500' : 'border-gray-200'}
                    `}
                  />
                  {error ? (
                    <p className="mt-2 text-sm text-red-500">{error}</p>
                  ) : (
                    <p className="mt-2 text-sm text-gray-400">You can change this later in settings</p>
                  )}
                </div>

                <button
                  onClick={handleCreate}
                  disabled={!isCreateValid || isLoading}
                  className="w-full py-3.5 px-6 bg-primary-gradient text-white font-semibold rounded-xl shadow-[0_4px_16px_rgba(124,58,237,0.3)] hover:shadow-[0_6px_20px_rgba(124,58,237,0.4)] hover:-translate-y-0.5 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed disabled:shadow-none disabled:translate-y-0 transition-all"
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Creating...
                    </span>
                  ) : (
                    'Create Household'
                  )}
                </button>
              </div>
            </>
          ) : (
            <>
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                Join a household
              </h2>
              <p className="text-gray-500 mb-8">
                Enter the invite code or scan the QR
              </p>

              {/* QR Scanner */}
              {isScanning ? (
                <div className="space-y-4 mb-6">
                  <div
                    id="qr-reader"
                    className="w-full rounded-xl overflow-hidden bg-black"
                    style={{ minHeight: '300px' }}
                  />
                  <button
                    onClick={stopScanner}
                    className="w-full py-3 px-4 border border-gray-300 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    Cancel Scanning
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Invite Code
                    </label>
                    <input
                      type="text"
                      value={inviteCode}
                      onChange={(e) => {
                        setInviteCode(e.target.value.toUpperCase());
                        if (error) setError('');
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && isJoinValid && !isLoading) {
                          e.preventDefault();
                          handleJoin();
                        }
                      }}
                      placeholder="e.g., ABC123"
                      autoCapitalize="characters"
                      disabled={isLoading}
                      className={`
                        w-full px-4 py-3.5 border rounded-xl text-gray-900 bg-white font-mono tracking-widest
                        placeholder:text-gray-400 placeholder:font-sans placeholder:tracking-normal
                        focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[rgba(124,58,237,0.15)]
                        disabled:opacity-50 disabled:cursor-not-allowed
                        ${error ? 'border-red-500' : 'border-gray-200'}
                      `}
                    />
                    {error && (
                      <div className="mt-2">
                        <p className="text-sm text-red-500">{error}</p>
                        {error.includes('denied') && (
                          <p className="text-xs text-gray-500 mt-1">
                            {/iPhone|iPad|iPod/i.test(navigator.userAgent)
                              ? 'Go to Settings → Safari → Camera and allow access'
                              : 'Tap the lock/info icon in the address bar to enable camera'}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => handleJoin()}
                    disabled={!isJoinValid || isLoading}
                    className="w-full py-3.5 px-6 bg-primary-gradient text-white font-semibold rounded-xl shadow-[0_4px_16px_rgba(124,58,237,0.3)] hover:shadow-[0_6px_20px_rgba(124,58,237,0.4)] hover:-translate-y-0.5 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed disabled:shadow-none disabled:translate-y-0 transition-all"
                  >
                    {isLoading ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Joining...
                      </span>
                    ) : (
                      'Join Household'
                    )}
                  </button>

                  {/* Scan QR - Only when config allows and HTTPS + mobile */}
                  {canScanQR && (
                    <>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-px bg-gray-200" />
                        <span className="text-sm text-gray-400">or</span>
                        <div className="flex-1 h-px bg-gray-200" />
                      </div>

                      <button
                        onClick={startScanner}
                        disabled={isLoading}
                        className="w-full py-3.5 px-6 border-2 border-[var(--color-primary)] text-[var(--color-primary)] font-semibold rounded-xl hover:bg-[var(--color-primary-bg)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h2M4 12h2m14 0h2M6 20h2M6 4h2m8 0h2" />
                        </svg>
                        Scan QR Code
                      </button>
                    </>
                  )}
                </div>
              )}
            </>
          )}
          </div>
        </div>
      </div>

      {/* Sign out confirmation modal */}
      {showSignOutModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-card glass-card-elevated max-w-sm w-full p-6">
            <div className="text-center mb-6">
              <div className="w-14 h-14 rounded-2xl bg-[var(--color-primary-bg)] flex items-center justify-center mx-auto mb-4">
                <svg className="w-7 h-7 text-[var(--color-primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Do you really want to go?
              </h3>
              <p className="text-gray-500 text-sm">
                Don't worry, you can pick up right where you left off!
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowSignOutModal(false)}
                className="flex-1 px-4 py-3 border border-[rgba(124,58,237,0.15)] text-gray-700 font-medium rounded-xl bg-white/60 hover:bg-white/80 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSignOut}
                className="flex-1 px-4 py-3 bg-primary-gradient text-white font-semibold rounded-xl shadow-[0_4px_12px_rgba(124,58,237,0.3)] transition-all"
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
