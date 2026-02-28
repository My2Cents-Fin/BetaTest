import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useAuth } from '../../app/providers/AuthProvider';
import { useHousehold, type HouseholdInfo } from '../../app/providers/HouseholdProvider';
import { signOut, deleteAccount } from '../../modules/auth/services/auth';
import { updateHouseholdName, updateDisplayName, getHouseholdMembers, type HouseholdMember } from '../../modules/onboarding/services/onboarding';
import { isQREnabled } from '../../config/app.config';
import { PrivacyInfoModal } from './PrivacyInfoModal';

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
  const { household: hhData } = useHousehold();
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
  const [isManageExpanded, setIsManageExpanded] = useState(false);
  const [isSettingsExpanded, setIsSettingsExpanded] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const displayName = user?.user_metadata?.display_name || 'User';
  const phone = user?.user_metadata?.phone_number || user?.phone || '';

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      setEditedDisplayName(displayName);
      setIsMembersExpanded(false);
      setIsManageExpanded(false);
      setIsSettingsExpanded(false);
      // Use household from HouseholdProvider context instead of querying
      if (hhData) {
        setHousehold(hhData);
        setEditedHouseholdName(hhData.name);
        getHouseholdMembers(hhData.id).then((membersList) => {
          setMembers(membersList);
          setIsLoading(false);
        });
      } else {
        setHousehold(null);
        setIsLoading(false);
      }
    }
  }, [isOpen, displayName, hhData]);

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

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    setDeleteError('');
    const result = await deleteAccount();
    if (result.success) {
      window.location.href = '/login';
    } else {
      setDeleteError(result.error || 'Failed to delete account.');
      setIsDeleting(false);
    }
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
        <div className="flex-1 overflow-y-auto scrollbar-thin p-5 space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-5 h-5 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {/* ======== MANAGE ACCOUNT SECTION ======== */}
              <section className="glass-card overflow-hidden">
                <button
                  onClick={() => setIsManageExpanded(!isManageExpanded)}
                  className="flex items-center justify-between w-full px-4 py-3"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-[var(--color-primary-bg)] flex items-center justify-center">
                      <svg className="w-4 h-4 text-[var(--color-primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <span className="text-sm font-semibold text-gray-900">Manage Account</span>
                  </div>
                  <svg
                    className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isManageExpanded ? 'rotate-180' : ''}`}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {isManageExpanded && (
                  <div className="border-t border-[rgba(124,58,237,0.06)]">
                    {/* Household */}
                    {household && (
                      <div className="px-4 py-3 space-y-3">
                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Household</p>
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
                                <button
                                  onClick={() => setIsEditingHouseholdName(true)}
                                  className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-200 transition-colors flex-shrink-0"
                                  aria-label="Edit household name"
                                >
                                  <svg className="w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                  </svg>
                                </button>
                                <button
                                  onClick={() => setIsMembersExpanded(!isMembersExpanded)}
                                  className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-200 transition-colors flex-shrink-0"
                                  aria-label="Show members"
                                >
                                  <svg
                                    className={`w-4 h-4 text-gray-500 transition-transform ${isMembersExpanded ? 'rotate-180' : ''}`}
                                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                                  >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                  </svg>
                                </button>
                              </div>
                            </div>

                            {/* Members accordion */}
                            {isMembersExpanded && (
                              <div className="mt-2 pt-2 border-t border-[rgba(124,58,237,0.06)]">
                                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Members</p>
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
                    )}

                    {/* Invite Others */}
                    {household && (
                      <div className="px-4 py-3 border-t border-[rgba(124,58,237,0.06)]">
                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Invite Others</p>
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
                            <p className="text-[10px] text-gray-400 text-center mt-2">Scan to join household</p>
                          </>
                        )}
                      </div>
                    )}

                    {/* Delete Account */}
                    <div className="px-4 py-3 border-t border-[rgba(124,58,237,0.06)]">
                      <button
                        onClick={() => { setShowDeleteConfirm(true); setDeleteError(''); }}
                        className="flex items-center gap-2.5 w-full text-left group"
                      >
                        <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0">
                          <svg className="w-4 h-4 text-red-400 group-hover:text-red-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm text-red-400 group-hover:text-red-500 transition-colors">Delete account & data</p>
                          <p className="text-[10px] text-gray-400">Permanently remove everything</p>
                        </div>
                      </button>
                    </div>
                  </div>
                )}
              </section>

              {/* ======== SETTINGS SECTION ======== */}
              <section className="glass-card overflow-hidden">
                <button
                  onClick={() => setIsSettingsExpanded(!isSettingsExpanded)}
                  className="flex items-center justify-between w-full px-4 py-3"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                      <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <span className="text-sm font-semibold text-gray-900">Settings</span>
                  </div>
                  <svg
                    className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isSettingsExpanded ? 'rotate-180' : ''}`}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {isSettingsExpanded && (
                  <div className="border-t border-[rgba(124,58,237,0.06)]">
                    {/* About */}
                    <div className="px-4 py-3 space-y-2">
                      <div className="flex items-center gap-2.5">
                        <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="text-sm text-gray-700">About My2cents</p>
                      </div>
                      <div className="ml-6.5 pl-0.5 space-y-1.5">
                        <p className="text-xs text-gray-500 leading-relaxed">
                          A household budgeting app built for Indian families. Plan monthly budgets, track daily expenses, and stay on top of your finances — together.
                        </p>
                        <div className="flex items-center gap-3 text-[10px] text-gray-400">
                          <span>v1.0</span>
                          <span className="w-0.5 h-0.5 rounded-full bg-gray-300" />
                          <span>Made in India</span>
                        </div>
                      </div>
                    </div>

                    {/* Data & Privacy */}
                    <button
                      onClick={() => setShowPrivacy(true)}
                      className="flex items-center gap-2.5 w-full px-4 py-3 border-t border-[rgba(124,58,237,0.06)] text-left hover:bg-gray-50/50 transition-colors"
                    >
                      <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                      <div>
                        <p className="text-sm text-gray-700">Data & Privacy</p>
                        <p className="text-[10px] text-gray-400">How your data is handled</p>
                      </div>
                    </button>

                    {/* Terms & Conditions */}
                    <button
                      onClick={() => window.open('/terms', '_blank')}
                      className="flex items-center gap-2.5 w-full px-4 py-3 border-t border-[rgba(124,58,237,0.06)] text-left hover:bg-gray-50/50 transition-colors"
                    >
                      <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <div>
                        <p className="text-sm text-gray-700">Terms & Conditions</p>
                        <p className="text-[10px] text-gray-400">Usage policies</p>
                      </div>
                    </button>

                  </div>
                )}
              </section>
            </>
          )}
        </div>

        {/* Sign Out — sole footer action */}
        <div className="px-5 py-4 border-t border-[rgba(124,58,237,0.06)] flex-shrink-0">
          <button
            onClick={handleSignOut}
            disabled={isSigningOut}
            className="flex items-center justify-center gap-2 w-full py-2.5 text-sm font-medium text-gray-600 hover:text-red-500 rounded-xl hover:bg-red-50/50 transition-all disabled:opacity-50"
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

      {/* Privacy Info Modal */}
      <PrivacyInfoModal
        isOpen={showPrivacy}
        onClose={() => setShowPrivacy(false)}
      />

      {/* Delete Account Confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-[0_8px_40px_rgba(0,0,0,0.15)]">
            <div className="text-center mb-5">
              <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-4">
                <svg className="w-7 h-7 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Delete your account?
              </h3>
              <p className="text-gray-500 text-sm leading-relaxed">
                This will <span className="font-semibold text-red-600">permanently delete</span> your account and all your data — transactions, budgets, and personal information.
              </p>
              {household && household.memberCount > 1 && (
                <p className="text-xs text-gray-400 mt-2">
                  Your household will be transferred to the next member.
                </p>
              )}
              {household && household.memberCount <= 1 && (
                <p className="text-xs text-red-400 mt-2">
                  Your household and all its data will be permanently deleted.
                </p>
              )}
              <p className="text-xs text-gray-500 mt-3 font-medium">
                This action cannot be undone.
              </p>
            </div>

            {deleteError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs">
                {deleteError}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                className="flex-1 px-4 py-3 border border-gray-200 text-gray-700 font-medium rounded-xl bg-white hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={isDeleting}
                className="flex-1 px-4 py-3 bg-red-500 text-white font-semibold rounded-xl hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                {isDeleting ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Deleting...
                  </span>
                ) : (
                  'Delete Everything'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
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
