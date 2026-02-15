import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useAuth } from '../../app/providers/AuthProvider';
import { signOut } from '../../modules/auth/services/auth';
import { getUserHousehold, updateHouseholdName, updateDisplayName, getHouseholdMembers, type HouseholdInfo, type HouseholdMember } from '../../modules/onboarding/services/onboarding';
import { isQREnabled } from '../../config/app.config';

interface ProfilePanelProps {
  isOpen: boolean;
  onClose: () => void;
}

// Format phone number as (+91) 8130944414
function formatPhoneDisplay(phone: string): string {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('91') && digits.length === 12) {
    return `(+91) ${digits.slice(2)}`;
  }
  if (digits.length === 10) {
    return `(+91) ${digits}`;
  }
  return phone;
}

export function ProfilePanel({ isOpen, onClose }: ProfilePanelProps) {
  const { user } = useAuth();
  const [household, setHousehold] = useState<HouseholdInfo | null>(null);
  const [members, setMembers] = useState<HouseholdMember[]>([]);
  const [isMembersExpanded, setIsMembersExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditingHouseholdName, setIsEditingHouseholdName] = useState(false);
  const [editedHouseholdName, setEditedHouseholdName] = useState('');
  const [isEditingDisplayName, setIsEditingDisplayName] = useState(false);
  const [editedDisplayName, setEditedDisplayName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const displayName = user?.user_metadata?.display_name || 'User';
  const phone = user?.phone || '';

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      setEditedDisplayName(displayName);
      setIsMembersExpanded(false);
      getUserHousehold().then(async (data) => {
        setHousehold(data);
        if (data) {
          setEditedHouseholdName(data.name);
          const membersList = await getHouseholdMembers(data.id);
          setMembers(membersList);
        }
        setIsLoading(false);
      });
    }
  }, [isOpen, displayName]);

  const getInviteUrl = () => {
    const { hostname, port, protocol } = window.location;
    const baseUrl = hostname === 'localhost' || hostname === '127.0.0.1'
      ? `${protocol}//${hostname}:${port}`
      : window.location.origin;
    return `${baseUrl}/join/${household?.inviteCode || ''}`;
  };

  const handleCopyCode = async () => {
    if (!household) return;
    try {
      await navigator.clipboard.writeText(household.inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textArea = document.createElement('textarea');
      textArea.value = household.inviteCode;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSaveHouseholdName = async () => {
    if (!household || !editedHouseholdName.trim()) return;
    setIsSaving(true);
    const result = await updateHouseholdName(household.id, editedHouseholdName.trim());
    if (result.success) {
      setHousehold({ ...household, name: editedHouseholdName.trim() });
      setIsEditingHouseholdName(false);
    }
    setIsSaving(false);
  };

  const handleSaveDisplayName = async () => {
    if (!editedDisplayName.trim()) return;
    setIsSaving(true);
    const result = await updateDisplayName(editedDisplayName.trim());
    if (result.success) {
      setIsEditingDisplayName(false);
      window.location.reload();
    }
    setIsSaving(false);
  };

  const handleSignOut = async () => {
    setIsSigningOut(true);
    await signOut();
    window.location.href = '/login';
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/40 backdrop-blur-sm z-40 transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={`fixed top-0 right-0 h-full w-full max-w-sm bg-white/90 backdrop-blur-xl z-50 shadow-[0_8px_40px_rgba(0,0,0,0.12)] transform transition-transform duration-300 ease-out flex flex-col ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="bg-primary-gradient text-white px-5 py-4 flex-shrink-0">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold">Profile</h2>
            <button
              onClick={onClose}
              className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* User info */}
          {isEditingDisplayName ? (
            <div className="space-y-2">
              <input
                type="text"
                value={editedDisplayName}
                onChange={(e) => setEditedDisplayName(e.target.value)}
                className="w-full px-3 py-2 bg-white/10 border border-white/30 rounded-lg text-white text-sm placeholder:text-white/50 focus:outline-none focus:border-white/60"
                placeholder="Your name"
                autoFocus
              />
              <div className="flex items-center gap-3">
                <button
                  onClick={handleSaveDisplayName}
                  disabled={isSaving || !editedDisplayName.trim()}
                  className="text-sm font-medium text-white hover:text-white/80 disabled:opacity-50"
                >
                  {isSaving ? 'Saving...' : 'Save'}
                </button>
                <span className="text-white/30">|</span>
                <button
                  onClick={() => {
                    setIsEditingDisplayName(false);
                    setEditedDisplayName(displayName);
                  }}
                  className="text-sm text-white/60 hover:text-white/80"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-lg font-bold flex-shrink-0">
                {displayName.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{displayName}</p>
                <p className="text-xs text-white/60">{formatPhoneDisplay(phone)}</p>
              </div>
              <button
                onClick={() => setIsEditingDisplayName(true)}
                className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors flex-shrink-0"
                aria-label="Edit name"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </button>
            </div>
          )}
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-5 h-5 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {/* Household Section */}
              {household && (
                <section>
                  <h3 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
                    Household
                  </h3>
                  <div className="glass-card p-3 space-y-3">
                    {/* Household Name */}
                    <div>
                      {isEditingHouseholdName ? (
                        <div className="space-y-2">
                          <input
                            type="text"
                            value={editedHouseholdName}
                            onChange={(e) => setEditedHouseholdName(e.target.value)}
                            className="w-full px-3 py-2 border border-[rgba(124,58,237,0.15)] rounded-xl text-sm text-gray-900 bg-white/75 focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[rgba(124,58,237,0.15)]"
                            autoFocus
                          />
                          <div className="flex items-center gap-3">
                            <button
                              onClick={handleSaveHouseholdName}
                              disabled={isSaving || !editedHouseholdName.trim()}
                              className="text-sm font-medium text-[var(--color-primary)] hover:text-[var(--color-primary)]/80 disabled:opacity-50"
                            >
                              {isSaving ? 'Saving...' : 'Save'}
                            </button>
                            <span className="text-gray-300">|</span>
                            <button
                              onClick={() => {
                                setIsEditingHouseholdName(false);
                                setEditedHouseholdName(household.name);
                              }}
                              className="text-sm text-gray-400 hover:text-gray-600"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-gray-900 font-medium text-sm">{household.name}</p>
                              <p className="text-xs text-gray-400 mt-0.5">
                                {household.role === 'owner' ? 'Owner' : 'Member'} · {household.memberCount} {household.memberCount === 1 ? 'member' : 'members'}
                              </p>
                            </div>
                            <div className="flex items-center gap-1">
                              {/* Edit button */}
                              <button
                                onClick={() => setIsEditingHouseholdName(true)}
                                className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-200 transition-colors flex-shrink-0"
                                aria-label="Edit household name"
                              >
                                <svg className="w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                </svg>
                              </button>
                              {/* Expand members accordion */}
                              <button
                                onClick={() => setIsMembersExpanded(!isMembersExpanded)}
                                className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-200 transition-colors flex-shrink-0"
                                aria-label="Show members"
                              >
                                <svg
                                  className={`w-4 h-4 text-gray-500 transition-transform ${isMembersExpanded ? 'rotate-180' : ''}`}
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                              </button>
                            </div>
                          </div>

                          {/* Members accordion */}
                          {isMembersExpanded && (
                            <div className="mt-3 pt-3 border-t border-[rgba(124,58,237,0.06)]">
                              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
                                Members
                              </p>
                              <div className="space-y-2">
                                {members.map((member) => (
                                  <div key={member.id} className="flex items-center justify-between py-1.5">
                                    <div className="flex items-center gap-2">
                                      <div className="w-7 h-7 bg-[var(--color-primary-bg)] rounded-xl flex items-center justify-center text-xs font-semibold text-[var(--color-primary)]">
                                        {member.displayName.charAt(0).toUpperCase()}
                                      </div>
                                      <div>
                                        <p className="text-sm text-gray-900">{member.displayName}</p>
                                        <p className="text-[10px] text-gray-400">
                                          Joined {new Date(member.joinedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                        </p>
                                      </div>
                                    </div>
                                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                                      member.role === 'owner'
                                        ? 'bg-[var(--color-primary-bg)] text-[var(--color-primary)]'
                                        : 'bg-gray-100 text-gray-600'
                                    }`}>
                                      {member.role === 'owner' ? 'Owner' : 'Member'}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </section>
              )}

              {/* Invite Section */}
              {household && (
                <section>
                  <h3 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
                    Invite Others
                  </h3>
                  <div className="glass-card p-3">
                    {/* Invite Code */}
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-white/75 border border-[rgba(124,58,237,0.15)] rounded-xl py-2 px-3">
                        <span className="font-mono font-semibold text-sm text-[var(--color-primary)] tracking-wider">
                          {household.inviteCode}
                        </span>
                      </div>
                      <button
                        onClick={handleCopyCode}
                        className="px-3 py-2 bg-primary-gradient text-white text-xs font-medium rounded-xl shadow-[0_2px_8px_rgba(124,58,237,0.3)] hover:shadow-[0_4px_12px_rgba(124,58,237,0.4)] transition-all"
                      >
                        {copied ? 'Copied!' : 'Copy'}
                      </button>
                    </div>

                    {/* QR Code - only when QR is enabled in config and on HTTPS */}
                    {isQREnabled() && (
                      <>
                        <div className="flex items-center gap-3 my-4">
                          <div className="flex-1 h-px bg-[rgba(124,58,237,0.06)]" />
                          <span className="text-xs text-gray-400">or</span>
                          <div className="flex-1 h-px bg-[rgba(124,58,237,0.06)]" />
                        </div>

                        <div className="flex justify-center">
                          <div className="bg-white/75 p-2 rounded-xl border border-[rgba(124,58,237,0.1)]">
                            <QRCodeSVG
                              value={getInviteUrl()}
                              size={100}
                              level="M"
                              bgColor="#ffffff"
                              fgColor="#6b21a8"
                            />
                          </div>
                        </div>
                        <p className="text-[10px] text-gray-400 text-center mt-2">
                          Scan to join household
                        </p>
                      </>
                    )}
                  </div>
                </section>
              )}
            </>
          )}
        </div>

        {/* Sign Out - Subtle link */}
        <div className="px-5 py-4 border-t border-[rgba(124,58,237,0.06)] flex-shrink-0">
          <button
            onClick={handleSignOut}
            disabled={isSigningOut}
            className="flex items-center justify-center gap-2 w-full text-sm text-gray-500 hover:text-red-500 transition-colors disabled:opacity-50"
          >
            {isSigningOut ? (
              <>
                <span className="w-4 h-4 border-2 border-gray-300 border-t-gray-500 rounded-full animate-spin" />
                <span>Signing out...</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span>Sign out</span>
              </>
            )}
          </button>
        </div>
      </div>
    </>
  );
}

// Hamburger Menu Button
export function MenuButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-white/60 transition-colors"
      aria-label="Open menu"
    >
      <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
      </svg>
    </button>
  );
}
