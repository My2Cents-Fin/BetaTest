import { useState, useEffect, useRef } from 'react';
import { getHouseholdCards, createCard, toggleCardActive } from '../../budget/services/cards';
import { formatCardDisplay } from '../../budget/types';
import type { HouseholdCard } from '../../budget/types';

interface CardManagementProps {
  householdId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function CardManagement({ householdId, isOpen, onClose }: CardManagementProps) {
  const [cards, setCards] = useState<HouseholdCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Add form state
  const [cardName, setCardName] = useState('');
  const [lastFour, setLastFour] = useState('');
  const [cardOwner, setCardOwner] = useState('');
  const [issuer, setIssuer] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const cardNameRef = useRef<HTMLInputElement>(null);

  // Load cards when opened
  useEffect(() => {
    if (isOpen) {
      loadCards();
    }
  }, [isOpen, householdId]);

  // Focus card name input when add form opens
  useEffect(() => {
    if (showAddForm) {
      setTimeout(() => cardNameRef.current?.focus(), 100);
    }
  }, [showAddForm]);

  async function loadCards() {
    setIsLoading(true);
    const result = await getHouseholdCards(householdId);
    if (result.success && result.cards) {
      setCards(result.cards);
    } else {
      setError(result.error || 'Failed to load cards');
    }
    setIsLoading(false);
  }

  const resetForm = () => {
    setCardName('');
    setLastFour('');
    setCardOwner('');
    setIssuer('');
    setFormError(null);
    setShowAddForm(false);
  };

  const handleAddCard = async () => {
    if (!cardName.trim()) {
      setFormError('Card name is required');
      return;
    }
    if (lastFour.length !== 4 || !/^\d{4}$/.test(lastFour)) {
      setFormError('Enter exactly 4 digits');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    const result = await createCard({
      householdId,
      cardName: cardName.trim(),
      lastFourDigits: lastFour,
      cardOwner: cardOwner.trim() || undefined,
      issuer: issuer.trim() || undefined,
    });

    setIsSubmitting(false);

    if (result.success && result.card) {
      setCards(prev => [...prev, result.card!]);
      resetForm();
    } else {
      setFormError(result.error || 'Failed to add card');
    }
  };

  const handleToggleActive = async (card: HouseholdCard) => {
    const result = await toggleCardActive(card.id, !card.is_active);
    if (result.success && result.card) {
      setCards(prev => prev.map(c => c.id === card.id ? result.card! : c));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[55] flex items-end md:items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full md:w-[440px] md:max-w-[90vw] bg-white/90 backdrop-blur-xl rounded-t-3xl md:rounded-2xl max-h-[85vh] overflow-hidden flex flex-col shadow-[0_8px_40px_rgba(0,0,0,0.12)]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[rgba(124,58,237,0.06)]">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[var(--color-primary-bg)] flex items-center justify-center">
              <span className="text-sm">💳</span>
            </div>
            <h2 className="text-base font-semibold text-gray-900">Credit Cards</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-xl hover:bg-white/60">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-5 h-5 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : error ? (
            <p className="text-sm text-red-500 text-center py-4">{error}</p>
          ) : (
            <>
              {/* Card List */}
              {cards.length === 0 && !showAddForm ? (
                <div className="text-center py-8">
                  <div className="w-14 h-14 rounded-2xl bg-[var(--color-primary-bg)] flex items-center justify-center mx-auto mb-3">
                    <span className="text-2xl">💳</span>
                  </div>
                  <p className="text-sm text-gray-500 mb-1">No credit cards added yet</p>
                  <p className="text-xs text-gray-400">Add your cards to track CC expenses separately</p>
                </div>
              ) : (
                <div className="space-y-2 mb-4">
                  {cards.map(card => (
                    <div
                      key={card.id}
                      className={`flex items-center justify-between p-3 rounded-xl border transition-colors ${
                        card.is_active
                          ? 'border-[rgba(124,58,237,0.1)] bg-white/60'
                          : 'border-gray-100 bg-gray-50/60 opacity-60'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <span className="text-lg flex-shrink-0">💳</span>
                        <div className="min-w-0">
                          <p className={`text-sm font-medium truncate ${card.is_active ? 'text-gray-900' : 'text-gray-500'}`}>
                            {card.card_name} <span className="text-gray-400">•••• {card.last_four_digits}</span>
                          </p>
                          <div className="flex items-center gap-2 text-[10px] text-gray-400">
                            {card.card_owner && <span>{card.card_owner}</span>}
                            {card.card_owner && card.issuer && <span className="w-0.5 h-0.5 rounded-full bg-gray-300" />}
                            {card.issuer && <span>{card.issuer}</span>}
                          </div>
                        </div>
                      </div>

                      {/* Active/Inactive toggle */}
                      <button
                        onClick={() => handleToggleActive(card)}
                        className={`relative w-10 h-[22px] rounded-full transition-colors flex-shrink-0 ml-3 ${
                          card.is_active ? 'bg-[var(--color-primary)]' : 'bg-gray-200'
                        }`}
                      >
                        <span className={`absolute top-[2px] left-[2px] w-[18px] h-[18px] rounded-full bg-white shadow transition-transform ${
                          card.is_active ? 'translate-x-[18px]' : 'translate-x-0'
                        }`} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add Card Form */}
              {showAddForm ? (
                <div className="glass-card p-4 space-y-3">
                  <h3 className="text-sm font-semibold text-gray-900">Add New Card</h3>

                  {/* Card Name */}
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Card Name <span className="text-red-400">*</span></label>
                    <input
                      ref={cardNameRef}
                      type="text"
                      value={cardName}
                      onChange={(e) => { setCardName(e.target.value); setFormError(null); }}
                      placeholder="e.g., HDFC Regalia"
                      className="w-full px-3 py-2.5 border border-[rgba(124,58,237,0.15)] rounded-xl text-sm text-gray-900 placeholder:text-gray-400 bg-white/75 focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[rgba(124,58,237,0.15)]"
                    />
                  </div>

                  {/* Last 4 Digits */}
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Last 4 Digits <span className="text-red-400">*</span></label>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={4}
                      value={lastFour}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                        setLastFour(val);
                        setFormError(null);
                      }}
                      placeholder="e.g., 4532"
                      className="w-full px-3 py-2.5 border border-[rgba(124,58,237,0.15)] rounded-xl text-sm text-gray-900 placeholder:text-gray-400 bg-white/75 focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[rgba(124,58,237,0.15)]"
                    />
                    <p className="text-[10px] text-gray-400 mt-1">Used to identify your card -- we don't store full card numbers</p>
                  </div>

                  {/* Card Owner (optional) */}
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Card Owner</label>
                    <input
                      type="text"
                      value={cardOwner}
                      onChange={(e) => setCardOwner(e.target.value)}
                      placeholder="Optional (e.g., Varshine)"
                      className="w-full px-3 py-2.5 border border-[rgba(124,58,237,0.15)] rounded-xl text-sm text-gray-900 placeholder:text-gray-400 bg-white/75 focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[rgba(124,58,237,0.15)]"
                    />
                  </div>

                  {/* Issuer (optional) */}
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Bank / Issuer</label>
                    <input
                      type="text"
                      value={issuer}
                      onChange={(e) => setIssuer(e.target.value)}
                      placeholder="Optional (e.g., HDFC Bank)"
                      className="w-full px-3 py-2.5 border border-[rgba(124,58,237,0.15)] rounded-xl text-sm text-gray-900 placeholder:text-gray-400 bg-white/75 focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[rgba(124,58,237,0.15)]"
                    />
                  </div>

                  {formError && <p className="text-sm text-red-500">{formError}</p>}

                  {/* Actions */}
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={resetForm}
                      className="flex-1 py-2.5 rounded-xl text-sm font-medium text-gray-600 border border-gray-200 hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAddCard}
                      disabled={isSubmitting || !cardName.trim() || lastFour.length !== 4}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                        isSubmitting || !cardName.trim() || lastFour.length !== 4
                          ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                          : 'bg-primary-gradient text-white shadow-[0_4px_16px_rgba(124,58,237,0.3)]'
                      }`}
                    >
                      {isSubmitting ? 'Adding...' : 'Add Card'}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowAddForm(true)}
                  className="w-full py-3 flex items-center justify-center gap-2 text-[var(--color-primary)] font-medium hover:bg-[var(--color-primary-bg)] rounded-xl transition-colors border border-dashed border-[rgba(124,58,237,0.2)]"
                >
                  <span className="text-lg">+</span>
                  <span>Add Credit Card</span>
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
