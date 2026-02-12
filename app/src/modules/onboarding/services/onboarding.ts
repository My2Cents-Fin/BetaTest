import { supabase } from '../../../lib/supabase';

export interface UpdateNameResult {
  success: boolean;
  error?: string;
}

export interface CreateHouseholdResult {
  success: boolean;
  error?: string;
  householdId?: string;
  inviteCode?: string;
}

/**
 * Update user's display name
 */
export async function updateDisplayName(name: string): Promise<UpdateNameResult> {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Update user metadata
    const { error: authError } = await supabase.auth.updateUser({
      data: { display_name: name },
    });

    if (authError) {
      return { success: false, error: authError.message };
    }

    // Also save to users table (optional - may fail if table doesn't exist yet)
    const { error: dbError } = await supabase
      .from('users')
      .upsert({
        id: user.id,
        display_name: name,
        phone: user.phone,
        updated_at: new Date().toISOString(),
      });

    if (dbError) {
      console.error('Failed to save to users table:', dbError);
      // Don't fail the flow - auth metadata is enough
    }

    return { success: true };
  } catch (e) {
    console.error('updateDisplayName error:', e);
    return { success: false, error: 'Failed to save name' };
  }
}

/**
 * Create a new household
 */
export async function createHousehold(name: string): Promise<CreateHouseholdResult> {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Create household
    const { data: household, error: hError } = await supabase
      .from('households')
      .insert({
        name,
        created_by: user.id,
      })
      .select('id, invite_code')
      .single();

    if (hError) {
      console.error('Create household error:', hError);
      return { success: false, error: 'Failed to create household' };
    }

    // Add user as owner
    const { error: mError } = await supabase
      .from('household_members')
      .insert({
        household_id: household.id,
        user_id: user.id,
        role: 'owner',
      });

    if (mError) {
      console.error('Add member error:', mError);
      // Rollback household creation
      await supabase.from('households').delete().eq('id', household.id);
      return { success: false, error: 'Failed to create household' };
    }

    return {
      success: true,
      householdId: household.id,
      inviteCode: household.invite_code,
    };
  } catch (e) {
    console.error('createHousehold error:', e);
    return { success: false, error: 'Failed to create household' };
  }
}

/**
 * Join a household by invite code
 */
export async function joinHousehold(inviteCode: string): Promise<CreateHouseholdResult> {
  try {
    console.log('[joinHousehold] Starting with invite code:', inviteCode);

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      console.log('[joinHousehold] No authenticated user');
      return { success: false, error: 'Not authenticated' };
    }

    console.log('[joinHousehold] User ID:', user.id);

    // Find household by invite code (case-insensitive)
    const { data: household, error: hError } = await supabase
      .from('households')
      .select('id')
      .ilike('invite_code', inviteCode)
      .single();

    console.log('[joinHousehold] Household query result:', { household, error: hError });

    if (hError || !household) {
      console.error('[joinHousehold] Household not found or error:', hError);
      return { success: false, error: 'Invalid invite code' };
    }

    console.log('[joinHousehold] Found household:', household.id);

    // Check if already a member
    const { data: existing } = await supabase
      .from('household_members')
      .select('id')
      .eq('household_id', household.id)
      .eq('user_id', user.id)
      .single();

    if (existing) {
      return {
        success: true,
        householdId: household.id,
        inviteCode,
      };
    }

    // Add user as member
    const { error: mError } = await supabase
      .from('household_members')
      .insert({
        household_id: household.id,
        user_id: user.id,
        role: 'member',
      });

    if (mError) {
      return { success: false, error: 'Failed to join household' };
    }

    return {
      success: true,
      householdId: household.id,
      inviteCode,
    };
  } catch (e) {
    console.error('joinHousehold error:', e);
    return { success: false, error: 'Failed to join household' };
  }
}

/**
 * Household info for profile display
 */
export interface HouseholdInfo {
  id: string;
  name: string;
  inviteCode: string;
  role: 'owner' | 'member';
  memberCount: number;
}

/**
 * Get user's household info
 */
export async function getUserHousehold(): Promise<HouseholdInfo | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return null;
    }

    // Get household membership
    const { data: membership, error: mError } = await supabase
      .from('household_members')
      .select('household_id, role')
      .eq('user_id', user.id)
      .single();

    if (mError || !membership) {
      return null;
    }

    // Get household details
    const { data: household, error: hError } = await supabase
      .from('households')
      .select('id, name, invite_code')
      .eq('id', membership.household_id)
      .single();

    if (hError || !household) {
      return null;
    }

    // Get member count
    const { count } = await supabase
      .from('household_members')
      .select('id', { count: 'exact', head: true })
      .eq('household_id', household.id);

    return {
      id: household.id,
      name: household.name,
      inviteCode: household.invite_code,
      role: membership.role as 'owner' | 'member',
      memberCount: count || 1,
    };
  } catch (e) {
    console.error('getUserHousehold error:', e);
    return null;
  }
}

/**
 * Household member info
 */
export interface HouseholdMember {
  id: string;
  userId: string;
  displayName: string;
  role: 'owner' | 'member';
  joinedAt: string;
}

/**
 * Get household members
 */
export async function getHouseholdMembers(householdId: string): Promise<HouseholdMember[]> {
  try {
    // Get current user to match their display name from auth metadata
    const { data: { user: currentUser } } = await supabase.auth.getUser();

    const { data: members, error } = await supabase
      .from('household_members')
      .select(`
        id,
        user_id,
        role,
        joined_at
      `)
      .eq('household_id', householdId)
      .order('joined_at', { ascending: true });

    if (error || !members) {
      console.error('getHouseholdMembers error:', error);
      return [];
    }

    // Get user details for each member
    const memberDetails: HouseholdMember[] = [];

    for (const member of members) {
      let displayName = 'Unknown';

      // If this is the current user, get name from auth metadata
      if (currentUser && member.user_id === currentUser.id) {
        displayName = currentUser.user_metadata?.display_name || 'Unknown';
      } else {
        // Try to get display name from users table
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('display_name')
          .eq('id', member.user_id)
          .single();

        if (!userError && userData?.display_name) {
          displayName = userData.display_name;
        }
      }

      memberDetails.push({
        id: member.id,
        userId: member.user_id,
        displayName,
        role: member.role as 'owner' | 'member',
        joinedAt: member.joined_at,
      });
    }

    return memberDetails;
  } catch (e) {
    console.error('getHouseholdMembers error:', e);
    return [];
  }
}

/**
 * Update household name
 */
export async function updateHouseholdName(householdId: string, name: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('households')
      .update({ name })
      .eq('id', householdId)
      .select();

    if (error) {
      console.error('updateHouseholdName error:', error);
      return { success: false, error: error.message };
    }

    // Check if any rows were actually updated
    if (!data || data.length === 0) {
      console.error('updateHouseholdName: No rows updated - likely RLS policy issue');
      return { success: false, error: 'Unable to update. You may not have permission.' };
    }

    console.log('Household name updated:', data[0]);
    return { success: true };
  } catch (e) {
    console.error('updateHouseholdName error:', e);
    return { success: false, error: 'Failed to update household name' };
  }
}
