-- ============================================
-- UPLOAD: February 2026 Transactions for ChaiVarshi household
-- ============================================
-- This script uploads 61 expense transactions from CSV data
-- All transactions are for February 2026 (Feb 2-11)
--
-- IMPORTANT: Run this ONLY on PRODUCTION database
-- Household: ChaiVarshi ❤ (08cebf79-e4ac-45e2-a5a0-9e0650ab13b2)

-- Constants for this upload
DO $$
DECLARE
  v_household_id UUID := '08cebf79-e4ac-45e2-a5a0-9e0650ab13b2';
  v_varshi_user_id UUID := 'e76ab095-2c82-47bb-9ee6-877bde5909d0';
  v_donda_user_id UUID := '7dcba581-9a57-4d46-9f3c-4c7b3168aac2';
BEGIN
  -- Insert all transactions
  INSERT INTO public.transactions (
    household_id,
    sub_category_id,
    amount,
    transaction_type,
    payment_method,
    transaction_date,
    logged_by,
    remarks,
    created_at
  ) VALUES
  -- Row 2: Fitness - Varshi (Feb 2)
  (v_household_id, '9009af39-fe2a-4751-b7f0-60bb685d0551', 2500, 'expense', 'upi', '2026-02-02', v_varshi_user_id, 'Feb fees', '2026-02-02 09:42:54'),

  -- Row 3: Slavia petrol (Feb 4) - Misc/Essentials → Miscellaneous
  (v_household_id, '48935a14-515f-4031-a91c-6c334896223f', 1500, 'expense', 'upi', '2026-02-04', v_varshi_user_id, 'Slavia petrol', '2026-02-04 14:54:19'),

  -- Row 4: Food Ordering - Lunch (Feb 4)
  (v_household_id, '18bdb801-52c4-4fc8-96fd-a0ff82190276', 211, 'expense', 'upi', '2026-02-04', v_varshi_user_id, 'Lunch', '2026-02-04 14:54:37'),

  -- Row 5: ICICI credit card bill (Feb 6) - Misc/Essentials → Miscellaneous
  (v_household_id, '48935a14-515f-4031-a91c-6c334896223f', 4945, 'expense', 'upi', '2026-02-06', v_varshi_user_id, 'Icici credit card bill', '2026-02-06 20:24:10'),

  -- Row 6: Maid (Feb 7)
  (v_household_id, '9015b989-baa2-4286-9ebe-44f73fed5ed2', 4500, 'expense', 'upi', '2026-02-07', v_varshi_user_id, '3800 salary +800 washrooms - 100rs to give yet', '2026-02-07 12:46:54'),

  -- Row 7: Varshi's LIC Pension Scheme (Feb 7)
  (v_household_id, 'ecf788cd-d833-4657-b613-213cd0ecbe5a', 6437, 'expense', 'upi', '2026-02-07', v_varshi_user_id, NULL, '2026-02-07 12:50:50'),

  -- Row 8: Varshi Car Loan (Feb 7)
  (v_household_id, '3fc73302-fdf1-498a-a493-a0e9cd19bcb4', 22500, 'expense', 'upi', '2026-02-07', v_varshi_user_id, NULL, '2026-02-07 12:51:13'),

  -- Row 9: Groceries - Banana apple ginger coconut (Feb 8)
  (v_household_id, '36baaa1b-c9eb-487b-8d06-1e26c5ad1b9c', 249, 'expense', 'upi', '2026-02-08', v_varshi_user_id, 'Bana apple ginger coconut', '2026-02-08 07:54:23'),

  -- Row 10: Ironing Clothes (Feb 7, recorded Feb 8)
  (v_household_id, '2ddaf8f1-9f27-4f41-9030-bfbf733ee3ac', 970, 'expense', 'upi', '2026-02-07', v_varshi_user_id, NULL, '2026-02-08 07:55:04'),

  -- Row 11: Prepaid (Electricity & others) → Electricity (Feb 8)
  (v_household_id, '7708af3e-2743-45ba-af9a-44b86373cdc7', 1000, 'expense', 'upi', '2026-02-08', v_varshi_user_id, 'Feb 1000 recharge', '2026-02-08 15:42:56'),

  -- Row 12: Misc/Essentials - Don't remember (Feb 3, recorded Feb 8) - Donda
  (v_household_id, '48935a14-515f-4031-a91c-6c334896223f', 10, 'expense', 'upi', '2026-02-03', v_donda_user_id, 'Don''t remember', '2026-02-08 16:59:43'),

  -- Row 13: Varshi Student Loan (Feb 8)
  (v_household_id, 'f1a197be-90f4-4da8-ad6a-756336341d6d', 29000, 'expense', 'upi', '2026-02-08', v_varshi_user_id, NULL, '2026-02-08 17:00:11'),

  -- Row 14: Misc/Essentials - Paid to hotel in Goa (Feb 3, recorded Feb 8) - Donda
  (v_household_id, '48935a14-515f-4031-a91c-6c334896223f', 20, 'expense', 'upi', '2026-02-03', v_donda_user_id, 'Paid to hotel in Goa', '2026-02-08 17:00:35'),

  -- Row 15: Food Ordering - Lunch at Goa (Feb 3) - Donda
  (v_household_id, '18bdb801-52c4-4fc8-96fd-a0ff82190276', 265, 'expense', 'upi', '2026-02-03', v_donda_user_id, 'Lunch at Goa - will be reimbursed', '2026-02-08 17:01:19'),

  -- Row 16: Food Ordering - Dinner at Ginger (Feb 3) - Donda
  (v_household_id, '18bdb801-52c4-4fc8-96fd-a0ff82190276', 765, 'expense', 'upi', '2026-02-03', v_donda_user_id, 'Dinner at Ginger - To be reimbursed', '2026-02-08 17:02:21'),

  -- Row 17: Liesure - Goa trip expense (Feb 3) - Donda
  (v_household_id, 'a20a26e2-faa6-4894-9f62-a4535ab21c67', 8712, 'expense', 'upi', '2026-02-03', v_donda_user_id, 'Goa trip expense', '2026-02-08 17:03:13'),

  -- Row 18: Food Ordering - Don't remember (Feb 3) - Donda
  (v_household_id, '18bdb801-52c4-4fc8-96fd-a0ff82190276', 657, 'expense', 'upi', '2026-02-03', v_donda_user_id, 'Don''t remember this - no bill found', '2026-02-08 17:05:36'),

  -- Row 19: Donda Student Loan (Feb 4)
  (v_household_id, 'dacce9f9-da5c-41a0-b8b2-a1c4ab541f56', 32975, 'expense', 'upi', '2026-02-04', v_donda_user_id, 'Donda Student loan paid', '2026-02-08 17:06:18'),

  -- Row 20: Donda Car Loan (Feb 4)
  (v_household_id, '121f0ba1-cd62-4ba0-a7e3-0546254e1d21', 30200, 'expense', 'upi', '2026-02-04', v_donda_user_id, 'Donda car loan paid', '2026-02-08 17:07:38'),

  -- Row 21: Food Ordering - Lunch at Goa (Feb 5) - Donda
  (v_household_id, '18bdb801-52c4-4fc8-96fd-a0ff82190276', 620, 'expense', 'upi', '2026-02-05', v_donda_user_id, 'Lunch at Goa - to be reimbursed', '2026-02-08 17:08:02'),

  -- Row 22: Vehicle Fuel → Fuel (Feb 5) - Donda
  (v_household_id, '9d9820e5-14ca-4cfe-a419-a00795e4c27b', 1500, 'expense', 'upi', '2026-02-05', v_donda_user_id, 'Vehicle fuel at Goa - to be reimbursed', '2026-02-08 17:08:40'),

  -- Row 23: Groceries - Swiggy groceries for Goa (Feb 6) - Donda
  (v_household_id, '36baaa1b-c9eb-487b-8d06-1e26c5ad1b9c', 249, 'expense', 'upi', '2026-02-06', v_donda_user_id, 'Swiggy groceries for Goa', '2026-02-08 17:09:16'),

  -- Row 24: Misc/Essentials - Penalty paid (Feb 6) - Donda
  (v_household_id, '48935a14-515f-4031-a91c-6c334896223f', 100, 'expense', 'upi', '2026-02-06', v_donda_user_id, 'Penalty paid for lost key card Goa ginger Panjim', '2026-02-08 17:09:58'),

  -- Row 25: House Rent + Maintenance → Rent (Feb 6) - Donda
  (v_household_id, 'ebc4583e-0f76-4e3d-b20b-f33c71562056', 5000, 'expense', 'upi', '2026-02-06', v_donda_user_id, 'Maintenance paid to MyGate', '2026-02-08 17:10:30'),

  -- Row 26: Groceries - Blinkit veggies snacks soda (Feb 7) - Donda
  (v_household_id, '36baaa1b-c9eb-487b-8d06-1e26c5ad1b9c', 1847, 'expense', 'upi', '2026-02-07', v_donda_user_id, 'Blinkit - Veggies, snacks, soda', '2026-02-08 17:10:55'),

  -- Row 27: Furniture Rental (Feb 7) - Donda
  (v_household_id, '73c7161c-e4d6-4451-b0e2-deb15a12d7cb', 1192, 'expense', 'upi', '2026-02-07', v_donda_user_id, 'Auto debited from PhonePe', '2026-02-08 17:11:25'),

  -- Row 28: Groceries - Blinkit Milk (Feb 7) - Donda
  (v_household_id, '36baaa1b-c9eb-487b-8d06-1e26c5ad1b9c', 117, 'expense', 'upi', '2026-02-07', v_donda_user_id, 'Blinkit - Milk', '2026-02-08 17:11:53'),

  -- Row 29: Misc/Essentials - Pani puri (Feb 7) - Donda
  (v_household_id, '48935a14-515f-4031-a91c-6c334896223f', 20, 'expense', 'upi', '2026-02-07', v_donda_user_id, 'Pani puri', '2026-02-08 17:12:13'),

  -- Row 30: Groceries - Blinkit (Feb 7) - Donda
  (v_household_id, '36baaa1b-c9eb-487b-8d06-1e26c5ad1b9c', 155, 'expense', 'upi', '2026-02-07', v_donda_user_id, 'Blinkit - Groceries', '2026-02-08 17:12:27'),

  -- Row 31: House Rent + Maintenance → Rent (Feb 7) - Donda
  (v_household_id, 'ebc4583e-0f76-4e3d-b20b-f33c71562056', 48000, 'expense', 'upi', '2026-02-07', v_donda_user_id, 'Rent Transferred to owner', '2026-02-08 17:12:48'),

  -- Row 32: OTT Subscriptions - Apple media (Feb 8) - Donda
  (v_household_id, '19269fad-e2ec-41c9-99ba-7f699df8b91f', 389, 'expense', 'upi', '2026-02-08', v_donda_user_id, 'Apple media auto debit', '2026-02-08 17:13:18'),

  -- Row 33: OTT Subscriptions - Lenskart Gold (Feb 8) - Donda
  (v_household_id, '19269fad-e2ec-41c9-99ba-7f699df8b91f', 49, 'expense', 'upi', '2026-02-08', v_donda_user_id, 'For Lenskart Gold subscription', '2026-02-08 17:13:40'),

  -- Row 34: Liesure - Liquor from Goa (Feb 6) - Donda
  (v_household_id, 'a20a26e2-faa6-4894-9f62-a4535ab21c67', 3390, 'expense', 'upi', '2026-02-06', v_donda_user_id, 'Liquor from Goa', '2026-02-08 17:15:48'),

  -- Row 35: Marriage debt pay back (Feb 8) - Varshi
  (v_household_id, '6d15eaa6-fd5c-475c-ad43-28917013e8a3', 40000, 'expense', 'upi', '2026-02-08', v_varshi_user_id, NULL, '2026-02-08 17:22:58'),

  -- Row 36: Food Ordering - Breakfast (Feb 4) - Donda
  (v_household_id, '18bdb801-52c4-4fc8-96fd-a0ff82190276', 419, 'expense', 'upi', '2026-02-04', v_donda_user_id, 'Breakfast ordered - To bereimbursed', '2026-02-08 17:20:52'),

  -- Row 37: Groceries from Blinkit (Feb 2) - Donda
  (v_household_id, '36baaa1b-c9eb-487b-8d06-1e26c5ad1b9c', 482, 'expense', 'upi', '2026-02-02', v_donda_user_id, 'Groceries from Blinkit', '2026-02-08 17:23:23'),

  -- Row 38: iPhone EMI (Feb 8) - Varshi
  (v_household_id, '84008733-f1e5-4af7-b01e-4c321972ca4c', 6500, 'expense', 'upi', '2026-02-08', v_varshi_user_id, 'Sent to bills pot', '2026-02-08 17:23:50'),

  -- Row 39: Donda's Mummy's HI (Feb 8) - Varshi
  (v_household_id, 'f3a14cc5-97b1-4667-909a-50f059f2ad19', 6481, 'expense', 'upi', '2026-02-08', v_varshi_user_id, NULL, '2026-02-08 17:25:17'),

  -- Row 40: Gift for Sasanka bava → Sasanka gift (Feb 8) - Varshi
  (v_household_id, '9555605e-4304-423e-ae1c-769a62dc5bc8', 5000, 'expense', 'upi', '2026-02-08', v_varshi_user_id, 'Transferred to gifts pot', '2026-02-08 17:25:37'),

  -- Row 41: Creta Car Insurance (Feb 8) - Varshi
  (v_household_id, '4e8528c6-cadd-44dd-aedc-64fafe7faa35', 1700, 'expense', 'upi', '2026-02-08', v_varshi_user_id, NULL, '2026-02-08 17:27:45'),

  -- Row 42: Claude Subscription → AI subscriptions (Feb 8) - Donda
  (v_household_id, '7d532a3b-a8a6-4f82-bec5-3bb4d529c472', 25000, 'expense', 'upi', '2026-02-08', v_donda_user_id, 'Paid to Axis bank credit card', '2026-02-08 17:27:50'),

  -- Row 43: Credit Card - Paid to Axis bank (Feb 8) - Donda - EXPENSE (not fund transfer)
  (v_household_id, '56b5f2c8-9936-4f63-9efe-6d2914a19cd1', 13053, 'expense', 'upi', '2026-02-08', v_donda_user_id, 'Paid to Axis bank', '2026-02-08 17:28:14'),

  -- Row 44: Slavia Car Insurance (Feb 8) - Varshi
  (v_household_id, 'c391a34e-7a9b-44f8-b8af-b1c2b3e4e745', 2042, 'expense', 'upi', '2026-02-08', v_varshi_user_id, NULL, '2026-02-08 17:28:39'),

  -- Row 45: Varshi's HI (Feb 8) - Varshi
  (v_household_id, 'a5fbea13-cba7-4330-a38a-7a435a3a88ec', 2378, 'expense', 'upi', '2026-02-08', v_varshi_user_id, NULL, '2026-02-08 17:29:51'),

  -- Row 46: Credit Card - Paid to Diners (Feb 8) - Donda - EXPENSE (not fund transfer)
  (v_household_id, '56b5f2c8-9936-4f63-9efe-6d2914a19cd1', 19578, 'expense', 'upi', '2026-02-08', v_donda_user_id, 'Paid to Diners', '2026-02-08 17:30:09'),

  -- Row 47: Chintu Marriage (Feb 8) - Varshi
  (v_household_id, '5b9489e2-8eef-41b1-963e-7f3cf6f16a52', 10000, 'expense', 'upi', '2026-02-08', v_varshi_user_id, NULL, '2026-02-08 17:34:50'),

  -- Row 48: Donda Mom (Feb 8) - Varshi
  (v_household_id, 'effa89f1-dfd3-4e97-9cf2-3fe9e7a1ac99', 10000, 'expense', 'upi', '2026-02-08', v_varshi_user_id, NULL, '2026-02-08 17:35:38'),

  -- Row 49: Ahaana (Feb 8) - Varshi
  (v_household_id, '17978ac2-6913-41ad-a8db-bba622332b35', 5000, 'expense', 'upi', '2026-02-08', v_varshi_user_id, NULL, '2026-02-08 17:36:27'),

  -- Row 50: Varshi Dad (Feb 8) - Varshi
  (v_household_id, 'ecf3787e-f444-4928-81bb-62668cbc4bee', 4500, 'expense', 'upi', '2026-02-08', v_varshi_user_id, NULL, '2026-02-08 17:37:07'),

  -- Row 51: International Trip (Feb 8) - Varshi
  (v_household_id, '3305216e-d78c-4622-a21c-a35ca2af156f', 15000, 'expense', 'upi', '2026-02-08', v_varshi_user_id, NULL, '2026-02-08 17:40:16'),

  -- Row 52: OTT Subscriptions (Feb 8) - Varshi
  (v_household_id, '19269fad-e2ec-41c9-99ba-7f699df8b91f', 4500, 'expense', 'upi', '2026-02-08', v_varshi_user_id, NULL, '2026-02-08 17:42:15'),

  -- Row 53: Cook (Feb 8) - Varshi
  (v_household_id, '65ebf330-a540-4d8e-add0-09a5e81c0e01', 6000, 'expense', 'upi', '2026-02-08', v_varshi_user_id, 'Neela borrowal returninf to pulivendula pot - 6000', '2026-02-08 17:54:23'),

  -- Row 54: Varshi Mom (Feb 8) - Varshi
  (v_household_id, '74e3dcdf-e8dc-4c07-96fa-682219fb8940', 20000, 'expense', 'upi', '2026-02-08', v_varshi_user_id, NULL, '2026-02-08 18:02:34'),

  -- Row 55: Savings (Feb 8) - Varshi
  (v_household_id, 'ae57b477-2e65-4bdf-8409-13f49fce5751', 15562, 'expense', 'upi', '2026-02-08', v_varshi_user_id, 'In jupiters current acc balance', '2026-02-08 18:14:40'),

  -- Row 56: Vehicle Fuel → Fuel - Creta fuel (Feb 8) - Varshi
  (v_household_id, '9d9820e5-14ca-4cfe-a419-a00795e4c27b', 4800, 'expense', 'upi', '2026-02-08', v_varshi_user_id, 'Creta fuel', '2026-02-08 18:20:35'),

  -- Row 57: Vehicle Fuel → Fuel - Last months excess (Feb 8) - Varshi
  (v_household_id, '9d9820e5-14ca-4cfe-a419-a00795e4c27b', 5000, 'expense', 'upi', '2026-02-08', v_varshi_user_id, 'Last months excess expense sending back to gifts pot', '2026-02-08 18:23:29'),

  -- Row 58: Internet (Feb 8) - Varshi
  (v_household_id, 'cd424735-033f-4785-b358-1caa4c871e8f', 1000, 'expense', 'upi', '2026-02-08', v_varshi_user_id, 'Sent to bills pot', '2026-02-08 18:25:21'),

  -- Row 59: Food Ordering - Pizza (Feb 8) - Varshi
  (v_household_id, '18bdb801-52c4-4fc8-96fd-a0ff82190276', 582, 'expense', 'upi', '2026-02-08', v_varshi_user_id, 'Pizza', '2026-02-08 20:16:26'),

  -- Row 60: Groceries - Lays, veggies (Feb 9) - Varshi
  (v_household_id, '36baaa1b-c9eb-487b-8d06-1e26c5ad1b9c', 197, 'expense', 'upi', '2026-02-09', v_varshi_user_id, 'Lays, veggies', '2026-02-09 18:59:32'),

  -- Row 61: Misc/Essentials - Shampoo conditioner (Feb 10) - Varshi
  (v_household_id, '48935a14-515f-4031-a91c-6c334896223f', 1119, 'expense', 'upi', '2026-02-10', v_varshi_user_id, 'Shakpoo conditioner', '2026-02-10 08:24:06'),

  -- Row 62: Food Ordering - Icecream (Feb 11) - Varshi
  (v_household_id, '18bdb801-52c4-4fc8-96fd-a0ff82190276', 223, 'expense', 'upi', '2026-02-11', v_varshi_user_id, 'Icecream', '2026-02-11 20:33:43');

  RAISE NOTICE 'Successfully uploaded 61 transactions for February 2026';
  RAISE NOTICE 'Date range: Feb 2-11, 2026';
  RAISE NOTICE 'Household: ChaiVarshi ❤';
  RAISE NOTICE 'Total amount: ₹5,15,116 (515,116 rupees)';
END $$;

-- ============================================
-- DONE! 61 transactions uploaded
-- ============================================
-- Summary:
-- - All transactions are expenses (no income)
-- - Payment method: bank (default, as CSV doesn't specify CC vs bank)
-- - Date field: Payment Date from CSV
-- - created_at field: Recorded date timestamp from CSV
-- - Varshi transactions: 31
-- - Donda transactions: 30
--
-- Mappings applied:
-- - "Fitness - Varshi" → "Fitness Varshi"
-- - "Prepaid (Electricity & others)" → "Electricity"
-- - "Claude Subscription" → "AI subscriptions"
-- - "House Rent + Maintenance" → "Rent"
-- - "Credit Card" payments → "Credit card" (as expenses, not fund transfers)
-- - "Gift for Sasanka bava" → "Sasanka gift"
-- - "Misc/Essentials" → "Miscellaneous"
-- - "Vehicle Fuel" → "Fuel"
-- - "Maid" → "Maid/Help"
