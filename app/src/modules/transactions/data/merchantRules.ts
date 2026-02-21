/**
 * Merchant-to-Category Mapping Rules
 *
 * Static master rule set mapping merchant keyword patterns to sub-category names.
 * Names (not IDs) are used because sub-categories are per-household with different IDs.
 *
 * Matching logic:
 * 1. Check narration against keywords (case-insensitive substring match)
 * 2. If keyword matches → look up subCategoryName in household's sub-categories
 * 3. If household HAS it → suggest it
 * 4. If household does NOT have it → leave uncategorized
 * 5. If no keyword matches → leave uncategorized
 */

export interface MerchantRule {
  keywords: string[];
  subCategoryName: string;
  transactionType: 'expense' | 'income';
  confidence: 'high' | 'medium';
}

export const MERCHANT_RULES: MerchantRule[] = [
  // ── Groceries ──
  {
    keywords: ['bigbasket', 'blinkit', 'zepto', 'dmart', 'more retail', 'spar', 'reliance smart', 'jiomart', 'nature basket', 'fresh to home', 'grofers', 'dunzo', 'instamart', 'bb instant', 'bb now'],
    subCategoryName: 'Groceries',
    transactionType: 'expense',
    confidence: 'high',
  },

  // ── Food Ordering ──
  {
    keywords: ['swiggy', 'zomato', 'eatsure', 'faasos', 'behrouz', 'dominos', 'domino', 'mcdonalds', 'mcdonald', 'kfc', 'burger king', 'pizza hut', 'subway', 'box8', 'eatfit', 'rebel foods'],
    subCategoryName: 'Food Ordering',
    transactionType: 'expense',
    confidence: 'high',
  },

  // ── Dining Out ──
  {
    keywords: ['restaurant', 'cafe', 'bistro', 'dhaba', 'biryani', 'bakery', 'starbucks', 'ccd', 'chaayos', 'third wave'],
    subCategoryName: 'Dining Out',
    transactionType: 'expense',
    confidence: 'medium',
  },

  // ── Fuel ──
  {
    keywords: ['indian oil', 'bharat petroleum', 'bpcl', 'hp petrol', 'hindustan petroleum', 'iocl', 'petrol', 'diesel', 'fuel station', 'petrol pump', 'hpcl'],
    subCategoryName: 'Fuel',
    transactionType: 'expense',
    confidence: 'high',
  },

  // ── Shopping ──
  {
    keywords: ['amazon', 'flipkart', 'myntra', 'ajio', 'nykaa', 'meesho', 'snapdeal', 'tatacliq', 'croma', 'reliance digital', 'vijay sales', 'decathlon'],
    subCategoryName: 'Shopping',
    transactionType: 'expense',
    confidence: 'medium',
  },

  // ── Entertainment ──
  {
    keywords: ['netflix', 'hotstar', 'prime video', 'spotify', 'youtube premium', 'bookmyshow', 'pvr', 'inox', 'cinepolis', 'disney', 'jiocinema', 'apple tv', 'sony liv', 'zee5'],
    subCategoryName: 'Entertainment',
    transactionType: 'expense',
    confidence: 'high',
  },

  // ── Subscriptions ──
  {
    keywords: ['subscription', 'apple.com', 'google storage', 'icloud', 'microsoft 365', 'adobe', 'chatgpt', 'openai'],
    subCategoryName: 'Subscriptions',
    transactionType: 'expense',
    confidence: 'medium',
  },

  // ── Phone Bill ──
  {
    keywords: ['airtel prepaid', 'airtel postpaid', 'jio recharge', 'jio prepaid', 'vodafone', 'vi telecom', 'bsnl', 'airtel mobile'],
    subCategoryName: 'Phone Bill',
    transactionType: 'expense',
    confidence: 'medium',
  },

  // ── Internet ──
  {
    keywords: ['act fibernet', 'airtel broadband', 'airtel xstream', 'jio fiber', 'hathway', 'you broadband', 'tata play fiber', 'excitel'],
    subCategoryName: 'Internet',
    transactionType: 'expense',
    confidence: 'high',
  },

  // ── Medical ──
  {
    keywords: ['apollo', 'pharmeasy', 'netmeds', 'medplus', '1mg', 'hospital', 'clinic', 'diagnostic', 'lab test', 'pathology', 'pharmacy', 'medical store'],
    subCategoryName: 'Medical',
    transactionType: 'expense',
    confidence: 'medium',
  },

  // ── Transport ──
  {
    keywords: ['uber', 'ola', 'rapido', 'metro', 'irctc', 'railway', 'makemytrip', 'goibibo', 'redbus', 'namma yatri', 'blablacar', 'indigo', 'spicejet', 'vistara', 'air india'],
    subCategoryName: 'Transport',
    transactionType: 'expense',
    confidence: 'high',
  },

  // ── Personal Care ──
  {
    keywords: ['urban company', 'urbanclap', 'salon', 'spa', 'parlour', 'parlor', 'grooming', 'barber'],
    subCategoryName: 'Personal Care',
    transactionType: 'expense',
    confidence: 'medium',
  },

  // ── Electricity ──
  {
    keywords: ['electricity', 'bescom', 'tata power', 'adani power', 'msedcl', 'torrent power', 'cesc', 'bses', 'electric bill'],
    subCategoryName: 'Electricity',
    transactionType: 'expense',
    confidence: 'high',
  },

  // ── Water ──
  {
    keywords: ['water bill', 'bwssb', 'jal board', 'water supply', 'water utility'],
    subCategoryName: 'Water',
    transactionType: 'expense',
    confidence: 'high',
  },

  // ── Society Maintenance ──
  {
    keywords: ['society', 'maintenance charge', 'association', 'rwa', 'apartment maintenance', 'flat maintenance', 'mygate'],
    subCategoryName: 'Society Maintenance',
    transactionType: 'expense',
    confidence: 'medium',
  },

  // ── Maid/Help ──
  {
    keywords: ['maid', 'helper', 'cook salary', 'domestic help', 'house help'],
    subCategoryName: 'Maid/Help',
    transactionType: 'expense',
    confidence: 'medium',
  },

  // ── Insurance ──
  {
    keywords: ['lic', 'life insurance', 'hdfc life', 'icici prudential', 'star health', 'max life', 'bajaj allianz', 'insurance premium', 'health insurance', 'term plan'],
    subCategoryName: 'Health Insurance',
    transactionType: 'expense',
    confidence: 'medium',
  },

  // ── EMI / Loan ──
  {
    keywords: ['emi', 'loan repay', 'loan emi', 'home loan', 'car loan', 'personal loan', 'education loan', 'equated monthly'],
    subCategoryName: 'Home Loan EMI',
    transactionType: 'expense',
    confidence: 'medium',
  },

  // ── Rent ──
  {
    keywords: ['rent payment', 'house rent', 'flat rent', 'room rent', 'rental'],
    subCategoryName: 'Rent',
    transactionType: 'expense',
    confidence: 'medium',
  },

  // ── Salary (Income) ──
  {
    keywords: ['salary', 'sal credit', 'monthly salary', 'neft credit.*salary', 'employer'],
    subCategoryName: 'Salary',
    transactionType: 'income',
    confidence: 'medium',
  },

  // ── General Savings (Income-like credits) ──
  {
    keywords: ['interest credit', 'int credit', 'fd interest', 'rd interest', 'savings interest'],
    subCategoryName: 'General Savings',
    transactionType: 'income',
    confidence: 'medium',
  },
];
