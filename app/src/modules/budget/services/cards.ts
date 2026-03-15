import { supabase } from '../../../lib/supabase';
import { track } from '../../../lib/analytics';
import type { HouseholdCard, CreateCardInput } from '../types';

// ============================================
// Result Types
// ============================================

export interface CardResult {
  success: boolean;
  error?: string;
  card?: HouseholdCard;
}

export interface CardsListResult {
  success: boolean;
  error?: string;
  cards?: HouseholdCard[];
}

// ============================================
// Card CRUD Functions
// ============================================

/**
 * Get all cards for a household (active + inactive)
 */
export async function getHouseholdCards(
  householdId: string
): Promise<CardsListResult> {
  try {
    const { data, error } = await supabase
      .from('household_cards')
      .select('*')
      .eq('household_id', householdId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('getHouseholdCards error:', error);
      return { success: false, error: 'Failed to load cards' };
    }

    return { success: true, cards: (data || []) as HouseholdCard[] };
  } catch (e) {
    console.error('getHouseholdCards error:', e);
    return { success: false, error: 'Failed to load cards' };
  }
}

/**
 * Get only active cards for a household (for dropdown in transaction form)
 */
export async function getActiveHouseholdCards(
  householdId: string
): Promise<CardsListResult> {
  try {
    const { data, error } = await supabase
      .from('household_cards')
      .select('*')
      .eq('household_id', householdId)
      .eq('is_active', true)
      .order('card_name', { ascending: true });

    if (error) {
      console.error('getActiveHouseholdCards error:', error);
      return { success: false, error: 'Failed to load cards' };
    }

    return { success: true, cards: (data || []) as HouseholdCard[] };
  } catch (e) {
    console.error('getActiveHouseholdCards error:', e);
    return { success: false, error: 'Failed to load cards' };
  }
}

/**
 * Create a new household card
 */
export async function createCard(
  input: CreateCardInput
): Promise<CardResult> {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    const insertData = {
      household_id: input.householdId,
      card_name: input.cardName.trim(),
      last_four_digits: input.lastFourDigits,
      card_owner: input.cardOwner?.trim() || null,
      issuer: input.issuer?.trim() || null,
      created_by: user.id,
    };

    const { data, error } = await supabase
      .from('household_cards')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      // Handle unique constraint violation
      if (error.code === '23505') {
        return { success: false, error: 'A card with this name and last 4 digits already exists in your household.' };
      }
      console.error('createCard error:', error);
      return { success: false, error: `Failed to add card: ${error.message}` };
    }

    track('card.created', { issuer: input.issuer || 'unknown' });
    return { success: true, card: data as HouseholdCard };
  } catch (e) {
    console.error('createCard error:', e);
    return { success: false, error: 'Failed to add card' };
  }
}

/**
 * Update card details (name, last four, owner, issuer)
 */
export async function updateCard(
  cardId: string,
  updates: { cardName?: string; lastFourDigits?: string; cardOwner?: string | null; issuer?: string | null }
): Promise<CardResult> {
  try {
    const updateData: Record<string, unknown> = {};
    if (updates.cardName !== undefined) updateData.card_name = updates.cardName.trim();
    if (updates.lastFourDigits !== undefined) updateData.last_four_digits = updates.lastFourDigits;
    if (updates.cardOwner !== undefined) updateData.card_owner = updates.cardOwner?.trim() || null;
    if (updates.issuer !== undefined) updateData.issuer = updates.issuer?.trim() || null;

    const { data, error } = await supabase
      .from('household_cards')
      .update(updateData)
      .eq('id', cardId)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return { success: false, error: 'A card with this name and last 4 digits already exists.' };
      }
      console.error('updateCard error:', error);
      return { success: false, error: 'Failed to update card' };
    }

    track('card.updated', {});
    return { success: true, card: data as HouseholdCard };
  } catch (e) {
    console.error('updateCard error:', e);
    return { success: false, error: 'Failed to update card' };
  }
}

/**
 * Toggle a card's active/inactive status
 */
export async function toggleCardActive(
  cardId: string,
  isActive: boolean
): Promise<CardResult> {
  try {
    const { data, error } = await supabase
      .from('household_cards')
      .update({ is_active: isActive })
      .eq('id', cardId)
      .select()
      .single();

    if (error) {
      console.error('toggleCardActive error:', error);
      return { success: false, error: 'Failed to update card' };
    }

    track('card.toggled', { is_active: isActive });
    return { success: true, card: data as HouseholdCard };
  } catch (e) {
    console.error('toggleCardActive error:', e);
    return { success: false, error: 'Failed to update card' };
  }
}
