-- ============================================
-- DEMO HOUSEHOLD SEED DATA
-- ============================================
-- Creates a realistic demo household with:
--   - 2 users (Ravi & Priya Sharma)
--   - Full budget plan for current month (frozen)
--   - 50+ transactions across all categories
--   - Variable categories at risk (75-100%) for dashboard "Daily Expenses to Watch"
--   - Overspent non-variable categories (>100%) for dashboard "Overspent Categories"
--   - Fund transfers between members
--   - Mix of payment methods (UPI, cash, card, netbanking)
--
-- PREREQUISITES:
--   1. Create two accounts via the app first (phone OTP)
--   2. Replace USER_1_ID and USER_2_ID below with their auth.users UUIDs
--   3. System categories must already be seeded (Income, EMI, Insurance, etc.)
--
-- INSTRUCTIONS:
--   1. Sign up User 1 with phone (e.g., 9111111111) — this will be "Ravi"
--   2. Sign up User 2 with phone (e.g., 9222222222) — this will be "Priya"
--   3. Get their UUIDs from auth.users:
--        SELECT id, phone FROM auth.users WHERE phone IN ('+919111111111', '+919222222222');
--   4. Replace the placeholder UUIDs below
--   5. Run this entire script in Supabase SQL Editor
-- ============================================

-- =====================
-- STEP 0: Set user IDs
-- =====================
-- >>> REPLACE THESE WITH REAL auth.users UUIDs <<<
DO $$
DECLARE
  v_user1_id UUID := '4ee05567-5f0d-474d-be2c-30f68088d18b'; -- Ravi
  v_user2_id UUID := '7466b2f9-1446-412a-8060-2daf77736f6c'; -- Priya

  v_household_id UUID := gen_random_uuid();
  v_plan_month DATE := date_trunc('month', CURRENT_DATE)::DATE;

  -- Category IDs (fetched from system categories table)
  v_cat_income UUID;
  v_cat_emi UUID;
  v_cat_insurance UUID;
  v_cat_savings UUID;
  v_cat_fixed UUID;
  v_cat_variable UUID;
  v_cat_family UUID;
  v_cat_investment UUID;
  v_cat_onetime UUID;

  -- Household sub-category IDs (we'll create these)
  v_sc_salary UUID := gen_random_uuid();
  v_sc_business UUID := gen_random_uuid();
  v_sc_rental UUID := gen_random_uuid();
  v_sc_home_emi UUID := gen_random_uuid();
  v_sc_car_emi UUID := gen_random_uuid();
  v_sc_health_ins UUID := gen_random_uuid();
  v_sc_life_ins UUID := gen_random_uuid();
  v_sc_vehicle_ins UUID := gen_random_uuid();
  v_sc_general_savings UUID := gen_random_uuid();
  v_sc_emergency UUID := gen_random_uuid();
  v_sc_sip UUID := gen_random_uuid();
  v_sc_rent UUID := gen_random_uuid();
  v_sc_electricity UUID := gen_random_uuid();
  v_sc_water UUID := gen_random_uuid();
  v_sc_internet UUID := gen_random_uuid();
  v_sc_phone UUID := gen_random_uuid();
  v_sc_maid UUID := gen_random_uuid();
  v_sc_subscriptions UUID := gen_random_uuid();
  v_sc_groceries UUID := gen_random_uuid();
  v_sc_fuel UUID := gen_random_uuid();
  v_sc_food_ordering UUID := gen_random_uuid();
  v_sc_dining UUID := gen_random_uuid();
  v_sc_shopping UUID := gen_random_uuid();
  v_sc_entertainment UUID := gen_random_uuid();
  v_sc_personal_care UUID := gen_random_uuid();
  v_sc_medical UUID := gen_random_uuid();
  v_sc_transport UUID := gen_random_uuid();
  v_sc_misc UUID := gen_random_uuid();
  v_sc_parents UUID := gen_random_uuid();
  v_sc_kids UUID := gen_random_uuid();
  v_sc_mutual_fund UUID := gen_random_uuid();
  v_sc_school_fees UUID := gen_random_uuid();

  v_plan_id UUID := gen_random_uuid();

BEGIN
  -- =====================
  -- STEP 1: Fetch system category IDs
  -- =====================
  SELECT id INTO v_cat_income FROM categories WHERE name = 'Income';
  SELECT id INTO v_cat_emi FROM categories WHERE name = 'EMI';
  SELECT id INTO v_cat_insurance FROM categories WHERE name = 'Insurance';
  SELECT id INTO v_cat_savings FROM categories WHERE name = 'Savings';
  SELECT id INTO v_cat_fixed FROM categories WHERE name = 'Fixed';
  SELECT id INTO v_cat_variable FROM categories WHERE name = 'Variable';
  SELECT id INTO v_cat_family FROM categories WHERE name = 'Family';
  SELECT id INTO v_cat_investment FROM categories WHERE name = 'Investment';
  SELECT id INTO v_cat_onetime FROM categories WHERE name = 'One-time';

  -- =====================
  -- STEP 2: Update user display names
  -- =====================
  UPDATE public.users SET display_name = 'Ravi', updated_at = now() WHERE id = v_user1_id;
  UPDATE public.users SET display_name = 'Priya', updated_at = now() WHERE id = v_user2_id;
  UPDATE auth.users SET raw_user_meta_data = raw_user_meta_data || '{"display_name": "Ravi"}'::jsonb WHERE id = v_user1_id;
  UPDATE auth.users SET raw_user_meta_data = raw_user_meta_data || '{"display_name": "Priya"}'::jsonb WHERE id = v_user2_id;

  -- =====================
  -- STEP 3: Create household
  -- =====================
  INSERT INTO households (id, name, created_by, invite_code)
  VALUES (v_household_id, 'Sharma Family', v_user1_id, 'SHRM' || substr(md5(random()::text), 1, 4));

  -- =====================
  -- STEP 4: Add household members
  -- =====================
  INSERT INTO household_members (household_id, user_id, role)
  VALUES
    (v_household_id, v_user1_id, 'owner'),
    (v_household_id, v_user2_id, 'member');

  -- =====================
  -- STEP 5: Create household sub-categories
  -- =====================
  INSERT INTO household_sub_categories (id, household_id, category_id, name, icon, is_custom, display_order) VALUES
    -- Income
    (v_sc_salary,        v_household_id, v_cat_income,     'Salary',            '💼', false, 1),
    (v_sc_business,      v_household_id, v_cat_income,     'Business Income',   '🏪', false, 2),
    (v_sc_rental,        v_household_id, v_cat_income,     'Rental Income',     '🏠', false, 3),
    -- EMI
    (v_sc_home_emi,      v_household_id, v_cat_emi,        'Home Loan EMI',     '🏠', false, 1),
    (v_sc_car_emi,       v_household_id, v_cat_emi,        'Car Loan EMI',      '🚗', false, 2),
    -- Insurance
    (v_sc_health_ins,    v_household_id, v_cat_insurance,  'Health Insurance',  '🏥', false, 1),
    (v_sc_life_ins,      v_household_id, v_cat_insurance,  'Life Insurance',    '❤️', false, 2),
    (v_sc_vehicle_ins,   v_household_id, v_cat_insurance,  'Vehicle Insurance', '🚙', false, 3),
    -- Savings
    (v_sc_general_savings, v_household_id, v_cat_savings,  'General Savings',   '💰', false, 1),
    (v_sc_emergency,     v_household_id, v_cat_savings,    'Emergency Fund',    '🆘', false, 2),
    (v_sc_sip,           v_household_id, v_cat_savings,    'Investment/SIP',    '📊', false, 3),
    -- Fixed
    (v_sc_rent,          v_household_id, v_cat_fixed,      'Rent',              '🏠', false, 1),
    (v_sc_electricity,   v_household_id, v_cat_fixed,      'Electricity',       '⚡', false, 2),
    (v_sc_water,         v_household_id, v_cat_fixed,      'Water',             '💧', false, 3),
    (v_sc_internet,      v_household_id, v_cat_fixed,      'Internet',          '📶', false, 4),
    (v_sc_phone,         v_household_id, v_cat_fixed,      'Phone Bill',        '📱', false, 5),
    (v_sc_maid,          v_household_id, v_cat_fixed,      'Maid/Help',         '🧹', false, 6),
    (v_sc_subscriptions, v_household_id, v_cat_fixed,      'Subscriptions',     '📺', false, 7),
    -- Variable
    (v_sc_groceries,     v_household_id, v_cat_variable,   'Groceries',         '🛒', false, 1),
    (v_sc_fuel,          v_household_id, v_cat_variable,   'Fuel',              '⛽', false, 2),
    (v_sc_food_ordering, v_household_id, v_cat_variable,   'Food Ordering',     '🍕', false, 3),
    (v_sc_dining,        v_household_id, v_cat_variable,   'Dining Out',        '🍽️', false, 4),
    (v_sc_shopping,      v_household_id, v_cat_variable,   'Shopping',          '🛍️', false, 5),
    (v_sc_entertainment, v_household_id, v_cat_variable,   'Entertainment',     '🎬', false, 6),
    (v_sc_personal_care, v_household_id, v_cat_variable,   'Personal Care',     '💅', false, 7),
    (v_sc_medical,       v_household_id, v_cat_variable,   'Medical',           '💊', false, 8),
    (v_sc_transport,     v_household_id, v_cat_variable,   'Transport',         '🚌', false, 9),
    (v_sc_misc,          v_household_id, v_cat_variable,   'Miscellaneous',     '📦', false, 10),
    -- Family (custom)
    (v_sc_parents,       v_household_id, v_cat_family,     'Parents Support',   '👴', true, 1),
    (v_sc_kids,          v_household_id, v_cat_family,     'Kids Expenses',     '👶', true, 2),
    -- Investment (custom)
    (v_sc_mutual_fund,   v_household_id, v_cat_investment, 'Mutual Funds',      '📈', true, 1),
    -- One-time (custom)
    (v_sc_school_fees,   v_household_id, v_cat_onetime,    'School Fees',       '🎓', true, 1);

  -- =====================
  -- STEP 6: Create monthly plan (FROZEN)
  -- =====================
  -- Total income: 1,85,000  |  Total allocated: 1,72,500
  INSERT INTO monthly_plans (id, household_id, plan_month, status, total_income, total_allocated, frozen_at)
  VALUES (v_plan_id, v_household_id, v_plan_month, 'frozen', 185000, 172500, now() - interval '10 days');

  -- =====================
  -- STEP 7: Budget allocations
  -- =====================
  INSERT INTO budget_allocations (household_id, sub_category_id, amount, period, monthly_amount, plan_month) VALUES
    -- INCOME (total: 1,85,000)
    (v_household_id, v_sc_salary,          150000, 'monthly',   150000, v_plan_month),  -- Ravi's salary
    (v_household_id, v_sc_business,          20000, 'monthly',    20000, v_plan_month),  -- Priya freelance
    (v_household_id, v_sc_rental,            15000, 'monthly',    15000, v_plan_month),  -- rental income

    -- EMI (total: 35,000)
    (v_household_id, v_sc_home_emi,          28000, 'monthly',    28000, v_plan_month),
    (v_household_id, v_sc_car_emi,            7000, 'monthly',     7000, v_plan_month),

    -- INSURANCE (total: 5,000 monthly equivalent)
    (v_household_id, v_sc_health_ins,        36000, 'yearly',      3000, v_plan_month),
    (v_household_id, v_sc_life_ins,          18000, 'yearly',      1500, v_plan_month),
    (v_household_id, v_sc_vehicle_ins,        6000, 'yearly',       500, v_plan_month),

    -- SAVINGS (total: 25,000)
    (v_household_id, v_sc_general_savings,   10000, 'monthly',    10000, v_plan_month),
    (v_household_id, v_sc_emergency,          5000, 'monthly',     5000, v_plan_month),
    (v_household_id, v_sc_sip,               10000, 'monthly',    10000, v_plan_month),

    -- FIXED (total: 37,500)
    (v_household_id, v_sc_rent,              22000, 'monthly',    22000, v_plan_month),
    (v_household_id, v_sc_electricity,        3500, 'monthly',     3500, v_plan_month),
    (v_household_id, v_sc_water,               800, 'monthly',      800, v_plan_month),
    (v_household_id, v_sc_internet,           1500, 'monthly',     1500, v_plan_month),
    (v_household_id, v_sc_phone,              1200, 'monthly',     1200, v_plan_month),
    (v_household_id, v_sc_maid,               4500, 'monthly',     4500, v_plan_month),
    (v_household_id, v_sc_subscriptions,      1000, 'monthly',     1000, v_plan_month),

    -- VARIABLE (total: 40,000) — designed for some to be at-risk (>=75%) and overspent
    (v_household_id, v_sc_groceries,          8000, 'monthly',     8000, v_plan_month),
    (v_household_id, v_sc_fuel,               5000, 'monthly',     5000, v_plan_month),
    (v_household_id, v_sc_food_ordering,      4000, 'monthly',     4000, v_plan_month),
    (v_household_id, v_sc_dining,             4000, 'monthly',     4000, v_plan_month),
    (v_household_id, v_sc_shopping,           5000, 'monthly',     5000, v_plan_month),
    (v_household_id, v_sc_entertainment,      3000, 'monthly',     3000, v_plan_month),
    (v_household_id, v_sc_personal_care,      2000, 'monthly',     2000, v_plan_month),
    (v_household_id, v_sc_medical,            3000, 'monthly',     3000, v_plan_month),
    (v_household_id, v_sc_transport,          3000, 'monthly',     3000, v_plan_month),
    (v_household_id, v_sc_misc,               3000, 'monthly',     3000, v_plan_month),

    -- FAMILY (total: 15,000)
    (v_household_id, v_sc_parents,           10000, 'monthly',    10000, v_plan_month),
    (v_household_id, v_sc_kids,               5000, 'monthly',     5000, v_plan_month),

    -- INVESTMENT (total: 10,000)
    (v_household_id, v_sc_mutual_fund,       10000, 'monthly',    10000, v_plan_month),

    -- ONE-TIME (total: 5,000)
    (v_household_id, v_sc_school_fees,        5000, 'one-time',    5000, v_plan_month);

  -- =====================
  -- STEP 8: Transactions
  -- =====================
  -- Designed so mid-month (~16th) the dashboard shows:
  --   • Variable at-risk: Food Ordering (95%), Dining Out (88%), Shopping (82%), Entertainment (77%)
  --   • Overspent: Electricity (114%) in Fixed
  --   • Healthy: Groceries (50%), Fuel (40%), etc.
  --   • Income recorded, fund transfers between Ravi & Priya

  -- ---- INCOME ----
  INSERT INTO transactions (household_id, sub_category_id, amount, transaction_type, transaction_date, payment_method, remarks, logged_by) VALUES
    (v_household_id, v_sc_salary,    150000, 'income', v_plan_month + 0,  'netbanking', 'Ravi Feb salary',       v_user1_id),
    (v_household_id, v_sc_business,   12000, 'income', v_plan_month + 4,  'upi',        'Priya client payment',  v_user2_id),
    (v_household_id, v_sc_business,    8000, 'income', v_plan_month + 11, 'upi',        'Priya 2nd client',      v_user2_id),
    (v_household_id, v_sc_rental,     15000, 'income', v_plan_month + 4,  'netbanking', 'Tenant rent received',  v_user1_id);

  -- ---- EMI (paid on 5th) ----
  INSERT INTO transactions (household_id, sub_category_id, amount, transaction_type, transaction_date, payment_method, remarks, logged_by) VALUES
    (v_household_id, v_sc_home_emi, 28000, 'expense', v_plan_month + 4, 'netbanking', 'Home loan EMI auto-debit', v_user1_id),
    (v_household_id, v_sc_car_emi,   7000, 'expense', v_plan_month + 4, 'netbanking', 'Car EMI auto-debit',      v_user1_id);

  -- ---- INSURANCE ----
  INSERT INTO transactions (household_id, sub_category_id, amount, transaction_type, transaction_date, payment_method, remarks, logged_by) VALUES
    (v_household_id, v_sc_health_ins,  3000, 'expense', v_plan_month + 0, 'netbanking', 'Health insurance premium', v_user1_id);

  -- ---- SAVINGS (transferred on 1st) ----
  INSERT INTO transactions (household_id, sub_category_id, amount, transaction_type, transaction_date, payment_method, remarks, logged_by) VALUES
    (v_household_id, v_sc_general_savings, 10000, 'expense', v_plan_month + 0, 'netbanking', 'Monthly savings transfer',  v_user1_id),
    (v_household_id, v_sc_emergency,        5000, 'expense', v_plan_month + 0, 'netbanking', 'Emergency fund deposit',    v_user1_id),
    (v_household_id, v_sc_sip,             10000, 'expense', v_plan_month + 0, 'netbanking', 'SIP auto-debit',            v_user1_id);

  -- ---- FIXED ----
  INSERT INTO transactions (household_id, sub_category_id, amount, transaction_type, transaction_date, payment_method, remarks, logged_by) VALUES
    (v_household_id, v_sc_rent,          22000, 'expense', v_plan_month + 0,  'netbanking', 'Rent to landlord',       v_user1_id),
    (v_household_id, v_sc_electricity,    2800, 'expense', v_plan_month + 7,  'upi',        'BESCOM bill',            v_user2_id),
    (v_household_id, v_sc_electricity,    1200, 'expense', v_plan_month + 14, 'upi',        'AC repair electrician',  v_user1_id),  -- OVERSPENT: 4000/3500 = 114%
    (v_household_id, v_sc_water,           800, 'expense', v_plan_month + 9,  'upi',        'Water bill',             v_user2_id),
    (v_household_id, v_sc_internet,       1500, 'expense', v_plan_month + 3,  'upi',        'Airtel broadband',       v_user1_id),
    (v_household_id, v_sc_phone,           599, 'expense', v_plan_month + 1,  'upi',        'Ravi Jio recharge',      v_user1_id),
    (v_household_id, v_sc_phone,           499, 'expense', v_plan_month + 1,  'upi',        'Priya Airtel recharge',  v_user2_id),
    (v_household_id, v_sc_maid,           4500, 'expense', v_plan_month + 0,  'cash',       'Maid salary',            v_user2_id),
    (v_household_id, v_sc_subscriptions,   199, 'expense', v_plan_month + 2,  'card',       'Netflix',                v_user1_id),
    (v_household_id, v_sc_subscriptions,   149, 'expense', v_plan_month + 2,  'card',       'Spotify',                v_user2_id),
    (v_household_id, v_sc_subscriptions,   299, 'expense', v_plan_month + 2,  'card',       'YouTube Premium',        v_user1_id);

  -- ---- VARIABLE (designed for at-risk dashboard view) ----

  -- Groceries: 4000/8000 = 50% (healthy)
  INSERT INTO transactions (household_id, sub_category_id, amount, transaction_type, transaction_date, payment_method, remarks, logged_by) VALUES
    (v_household_id, v_sc_groceries, 1200, 'expense', v_plan_month + 1,  'upi',  'BigBasket weekly order',    v_user2_id),
    (v_household_id, v_sc_groceries,  850, 'expense', v_plan_month + 4,  'upi',  'Vegetables from market',    v_user2_id),
    (v_household_id, v_sc_groceries, 1100, 'expense', v_plan_month + 8,  'upi',  'BigBasket order',           v_user2_id),
    (v_household_id, v_sc_groceries,  850, 'expense', v_plan_month + 12, 'cash', 'Local kirana store',        v_user2_id);

  -- Fuel: 2000/5000 = 40% (healthy)
  INSERT INTO transactions (household_id, sub_category_id, amount, transaction_type, transaction_date, payment_method, remarks, logged_by) VALUES
    (v_household_id, v_sc_fuel, 1200, 'expense', v_plan_month + 2,  'upi', 'Petrol - HP',      v_user1_id),
    (v_household_id, v_sc_fuel,  800, 'expense', v_plan_month + 10, 'upi', 'Petrol - Indian Oil', v_user1_id);

  -- Food Ordering: 3800/4000 = 95% (AT RISK!)
  INSERT INTO transactions (household_id, sub_category_id, amount, transaction_type, transaction_date, payment_method, remarks, logged_by) VALUES
    (v_household_id, v_sc_food_ordering,  450, 'expense', v_plan_month + 1,  'upi',  'Swiggy - dinner',       v_user1_id),
    (v_household_id, v_sc_food_ordering,  380, 'expense', v_plan_month + 3,  'upi',  'Zomato - lunch',        v_user2_id),
    (v_household_id, v_sc_food_ordering,  520, 'expense', v_plan_month + 5,  'upi',  'Swiggy - weekend order',v_user1_id),
    (v_household_id, v_sc_food_ordering,  350, 'expense', v_plan_month + 7,  'upi',  'Zomato - snacks',       v_user2_id),
    (v_household_id, v_sc_food_ordering,  480, 'expense', v_plan_month + 9,  'upi',  'Swiggy - biryani',      v_user1_id),
    (v_household_id, v_sc_food_ordering,  420, 'expense', v_plan_month + 11, 'upi',  'Zomato - pizza night',  v_user2_id),
    (v_household_id, v_sc_food_ordering,  350, 'expense', v_plan_month + 13, 'upi',  'Swiggy - quick bite',   v_user1_id),
    (v_household_id, v_sc_food_ordering,  850, 'expense', v_plan_month + 14, 'upi',  'Swiggy party order',    v_user2_id);

  -- Dining Out: 3500/4000 = 88% (AT RISK!)
  INSERT INTO transactions (household_id, sub_category_id, amount, transaction_type, transaction_date, payment_method, remarks, logged_by) VALUES
    (v_household_id, v_sc_dining, 1200, 'expense', v_plan_month + 3,  'card', 'Anniversary dinner at Toit',  v_user1_id),
    (v_household_id, v_sc_dining,  800, 'expense', v_plan_month + 7,  'upi',  'Lunch with friends',          v_user2_id),
    (v_household_id, v_sc_dining,  650, 'expense', v_plan_month + 10, 'upi',  'Coffee + brunch at Third Wave', v_user1_id),
    (v_household_id, v_sc_dining,  850, 'expense', v_plan_month + 14, 'card', 'Family dinner out',           v_user2_id);

  -- Shopping: 4100/5000 = 82% (AT RISK!)
  INSERT INTO transactions (household_id, sub_category_id, amount, transaction_type, transaction_date, payment_method, remarks, logged_by) VALUES
    (v_household_id, v_sc_shopping, 1800, 'expense', v_plan_month + 2,  'card', 'Myntra - winter sale',        v_user2_id),
    (v_household_id, v_sc_shopping,  950, 'expense', v_plan_month + 6,  'upi',  'Amazon - household items',    v_user1_id),
    (v_household_id, v_sc_shopping, 1350, 'expense', v_plan_month + 12, 'card', 'Ajio - shoes + clothes',      v_user2_id);

  -- Entertainment: 2300/3000 = 77% (AT RISK!)
  INSERT INTO transactions (household_id, sub_category_id, amount, transaction_type, transaction_date, payment_method, remarks, logged_by) VALUES
    (v_household_id, v_sc_entertainment,  600, 'expense', v_plan_month + 3,  'upi',  'PVR movie tickets',         v_user1_id),
    (v_household_id, v_sc_entertainment,  450, 'expense', v_plan_month + 6,  'upi',  'Book My Show - comedy show', v_user2_id),
    (v_household_id, v_sc_entertainment,  800, 'expense', v_plan_month + 10, 'card', 'Bowling + arcade',          v_user1_id),
    (v_household_id, v_sc_entertainment,  450, 'expense', v_plan_month + 14, 'upi',  'Netflix & snacks evening',  v_user2_id);

  -- Personal Care: 900/2000 = 45% (healthy)
  INSERT INTO transactions (household_id, sub_category_id, amount, transaction_type, transaction_date, payment_method, remarks, logged_by) VALUES
    (v_household_id, v_sc_personal_care, 500, 'expense', v_plan_month + 5,  'upi',  'Salon - haircut',          v_user1_id),
    (v_household_id, v_sc_personal_care, 400, 'expense', v_plan_month + 8,  'cash', 'Priya - parlour visit',    v_user2_id);

  -- Medical: 1500/3000 = 50% (healthy)
  INSERT INTO transactions (household_id, sub_category_id, amount, transaction_type, transaction_date, payment_method, remarks, logged_by) VALUES
    (v_household_id, v_sc_medical, 800, 'expense', v_plan_month + 6,  'upi',  'Apollo pharmacy - medicines',   v_user2_id),
    (v_household_id, v_sc_medical, 700, 'expense', v_plan_month + 11, 'upi',  'Doctor consultation',           v_user1_id);

  -- Transport: 1800/3000 = 60% (moderate)
  INSERT INTO transactions (household_id, sub_category_id, amount, transaction_type, transaction_date, payment_method, remarks, logged_by) VALUES
    (v_household_id, v_sc_transport, 350, 'expense', v_plan_month + 2,  'upi', 'Uber to office',     v_user1_id),
    (v_household_id, v_sc_transport, 280, 'expense', v_plan_month + 5,  'upi', 'Ola - airport drop',  v_user2_id),
    (v_household_id, v_sc_transport, 450, 'expense', v_plan_month + 8,  'upi', 'Rapido bike taxi',    v_user1_id),
    (v_household_id, v_sc_transport, 320, 'expense', v_plan_month + 11, 'upi', 'Auto to mall',        v_user2_id),
    (v_household_id, v_sc_transport, 400, 'expense', v_plan_month + 14, 'upi', 'Uber - late night',   v_user1_id);

  -- Miscellaneous: 1200/3000 = 40% (healthy)
  INSERT INTO transactions (household_id, sub_category_id, amount, transaction_type, transaction_date, payment_method, remarks, logged_by) VALUES
    (v_household_id, v_sc_misc,  500, 'expense', v_plan_month + 4,  'cash', 'Courier charges',      v_user1_id),
    (v_household_id, v_sc_misc,  350, 'expense', v_plan_month + 9,  'upi',  'Printing + xerox',     v_user2_id),
    (v_household_id, v_sc_misc,  350, 'expense', v_plan_month + 13, 'cash', 'Tips + misc expenses', v_user1_id);

  -- ---- FAMILY ----
  INSERT INTO transactions (household_id, sub_category_id, amount, transaction_type, transaction_date, payment_method, remarks, logged_by) VALUES
    (v_household_id, v_sc_parents, 10000, 'expense', v_plan_month + 0, 'netbanking', 'Monthly parents support',  v_user1_id),
    (v_household_id, v_sc_kids,     2500, 'expense', v_plan_month + 3, 'upi',        'Kids art supplies',        v_user2_id),
    (v_household_id, v_sc_kids,     1800, 'expense', v_plan_month + 9, 'cash',       'Kids birthday party items', v_user2_id);

  -- ---- INVESTMENT ----
  INSERT INTO transactions (household_id, sub_category_id, amount, transaction_type, transaction_date, payment_method, remarks, logged_by) VALUES
    (v_household_id, v_sc_mutual_fund, 10000, 'expense', v_plan_month + 4, 'netbanking', 'Groww SIP - Feb',  v_user1_id);

  -- ---- ONE-TIME ----
  INSERT INTO transactions (household_id, sub_category_id, amount, transaction_type, transaction_date, payment_method, remarks, logged_by) VALUES
    (v_household_id, v_sc_school_fees, 5000, 'expense', v_plan_month + 2, 'netbanking', 'School term 2 fees', v_user2_id);

  -- ---- FUND TRANSFERS (between Ravi & Priya) ----
  INSERT INTO transactions (household_id, sub_category_id, amount, transaction_type, transaction_date, payment_method, remarks, logged_by, transfer_to) VALUES
    (v_household_id, NULL, 30000, 'transfer', v_plan_month + 0, 'upi', 'Monthly household budget to Priya', v_user1_id, v_user2_id),
    (v_household_id, NULL, 5000,  'transfer', v_plan_month + 8, 'upi', 'Extra for kids expenses',           v_user1_id, v_user2_id),
    (v_household_id, NULL, 2000,  'transfer', v_plan_month + 12, 'upi', 'Returning extra amount',           v_user2_id, v_user1_id);

  RAISE NOTICE 'Demo household created successfully!';
  RAISE NOTICE 'Household: Sharma Family (ID: %)', v_household_id;
  RAISE NOTICE 'Plan month: % (FROZEN)', v_plan_month;
  RAISE NOTICE 'Transactions inserted for a realistic mid-month view.';

END $$;
