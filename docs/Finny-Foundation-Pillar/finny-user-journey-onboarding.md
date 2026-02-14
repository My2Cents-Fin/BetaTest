# My2cents — User Journeys for Onboarding (Foundation Pillar)

## About This Document

This document describes the user journeys for onboarding in the Foundation pillar. Each journey maps the screens, interactions, and decisions the user encounters.

For the feature definitions and priorities, refer to **My2cents Solution - Foundation.md**.

> **Implementation Status (Feb 2026):** The core onboarding flow is BUILT and deployed. Key differences from the original spec:
> - Brand is **My2cents** (not Finny), tagline is "Money, together"
> - OTP is **6 digits** (not 4 as originally specified)
> - Font is **Poppins** (not Inter or JetBrains Mono)
> - **Category Template is part of the Budget Tab**, not a separate onboarding screen
> - **WhisperFlow (Option 2 chat-based onboarding) is NOT BUILT** — planned for future
> - **Savings preference screen is NOT BUILT** — deferred (decision: ask when user first needs bucket features)
> - **Account/bank registration is NOT BUILT** — deferred to P1
> - The actual onboarding flow is: Phone → OTP → Success → Name → Household → (optional Invite) → Budget Tab

### Core Design Rules

1. **Take data where it is needed and when it is needed.** Don't collect information upfront that is only useful later.
2. **Reduce integrations.** Every external dependency is cost, effort, and a failure point.
3. **Keep it simple.** Any layman should understand every screen without instructions.
4. **Don't be verbose.** Short labels, short descriptions, no walls of text. People don't read.
5. **Get to the aha moment ASAP.** The faster users see their money laid out, the faster they're hooked.

---

## 1. Household Setup & Onboarding (7.1)

### 1.1 Flow Overview

Four screens to start. Category setup is mandatory (can save draft and return, but cannot skip).

```
Phone + OTP → Name → Household Name → Category Template (mandatory) → Dashboard
```

Partner joining:
```
Scan QR → Phone + OTP → Name → In
```

### 1.2 Screen 1: Sign In

**Design Preview:** [14-onboarding-flow.html](../../design-previews/14-onboarding-flow.html) → Screen "1. Phone"

**What the user sees:**
- App logo + tagline ("Money, together")
- Phone number field with country code pre-set to +91 (flag + code displayed)
- "Send OTP" button
- Footer with Terms of Service & Privacy Policy links

**On tap "Send OTP":**
- Validate phone number (see Field Validations below)
- If valid: Call Supabase `signInWithOtp({ phone })`
- Show loading state on button ("Sending...")
- On success: Navigate to OTP screen
- On error: Show inline error below phone field

**Notes:**
- No passwords. No email. Phone + OTP only.
- Supabase handles OTP delivery and verification natively.
- Country code is fixed to +91 (India only for MVP).

---

### 1.2.1 Screen 1b: OTP Verification

**Design Preview:** [14-onboarding-flow.html](../../design-previews/14-onboarding-flow.html) → Screen "2. OTP" and "2b. OTP Error"

**What the user sees:**
- Back arrow to return to phone entry
- "Verify OTP" title
- Subtitle showing masked phone: "Enter the 6-digit code sent to +91 98765 43210"
- 6 individual OTP input boxes (auto-focus to next on entry)
- Resend timer: "Didn't receive code? Resend in 0:28"
- "Verify" button

**Interactions:**

| Action | Behavior |
|--------|----------|
| Enter digit | Auto-advance cursor to next box |
| Backspace on empty box | Move cursor to previous box |
| Paste 6-digit code | Auto-fill all boxes, auto-submit |
| All 6 digits entered | Enable "Verify" button |
| Tap "Verify" | Validate OTP with Supabase |
| OTP correct | Show success screen → route based on user status |
| OTP incorrect | Show error state (see below) |
| Tap "Resend" (after timer) | Resend OTP, restart 30s timer |
| Tap "Back" | Return to phone entry screen |

**Error State:**
- All 6 OTP boxes turn red with shake animation (0.5s)
- Error alert appears above inputs: "⚠️ Incorrect code. Please try again."
- Resend link becomes active immediately
- User can re-enter code

**Resend Logic:**
- Initial cooldown: 30 seconds
- Display countdown: "Resend in 0:28"
- After cooldown: Show "Resend OTP" as tappable link
- Max resends per session: 3
- After 3 resends: "Too many attempts. Try again in 15 minutes."

---

### 1.2.2 Screen 1c: Verification Success

**Design Preview:** [14-onboarding-flow.html](../../design-previews/14-onboarding-flow.html) → Screen "3. Success"

**What the user sees:**
- Green gradient background
- Checkmark icon in white circle (scale-in animation)
- "You're in!" title
- "Phone verified successfully" subtitle

**Behavior:**
- Display for 1.5 seconds
- Auto-navigate to next screen based on user status:
  - New user → Screen 2 (Your Name)
  - Returning user → Dashboard

---

### 1.3 Screen 2: Your Name

**Design Preview:** [14-onboarding-flow.html](../../design-previews/14-onboarding-flow.html) → Screen "4. Your Name"

**What the user sees:**
- Progress indicator: 4 dots (dot 2 active)
- Friendly illustration (👋 wave emoji)
- "What should we call you?" title
- "Just your first name is fine" subtitle
- Single text input, placeholder: "e.g., Varshi"
- "Continue" button

**Interactions:**

| Action | Behavior |
|--------|----------|
| Focus input | Show keyboard, blue focus ring |
| Type name | Enable "Continue" button when ≥2 characters |
| Tap "Continue" | Validate → Save to user profile → Navigate to Screen 3 |
| Empty/invalid input + tap Continue | Show inline error below field |

**Data Persistence:**
- Save to `users.display_name` in Supabase
- This name is shown in greetings: "Good morning, Varshi"

**Notes:**
- Just a first name. No last name field. Keep it casual.
- One field, one tap, move on.

---

### 1.4 Screen 3: Household (Create or Join)

**Design Preview:** [14-onboarding-flow.html](../../design-previews/14-onboarding-flow.html) → Screen "5. Household"

This screen supports two modes: **Create New** (default) and **Join Existing**.

#### Mode Toggle

**What the user sees:**
- Step indicator: "Step 2 of 3"
- Two toggle buttons: **"Create New"** | **"Join Existing"**
- Default selection: Create New
- Switching modes clears any error messages

---

#### 1.4.1 Create New Household (Default)

**What the user sees:**
- Progress indicator: Step 2 of 3
- House illustration (🏠 emoji)
- "Name your household" title
- "This helps identify your shared finances" subtitle
- Single text input, placeholder: "e.g., Sharma Family"
- Helper text: "You can change this later in settings"
- "Create Household" button

**Interactions:**

| Action | Behavior |
|--------|----------|
| Focus input | Show keyboard, purple focus ring |
| Type name | Enable button when ≥2 characters |
| Tap "Create Household" | Validate → Create household → Navigate to Invite screen |
| Empty/invalid input + tap button | Show inline error below field |

**Data Persistence:**
- Create record in `households` table with auto-generated `invite_code`
- Create record in `household_members` linking user to household (role: `owner`)
- Save household name to `households.name`

**After tapping Create:**
- Household created. User is the first member (owner).
- Navigate to Invite screen (Step 3 of 3)
- The invite code is always accessible later from Settings → Profile panel

---

#### 1.4.2 Join Existing Household

**What the user sees:**
- Progress indicator: Step 2 of 3
- House illustration (🏠 emoji)
- "Join a household" title
- "Enter the invite code or scan the QR" subtitle
- Invite code input field (uppercase, monospace font)
- "Join Household" button
- QR scan button (conditional — see notes below)

**Interactions:**

| Action | Behavior |
|--------|----------|
| Enter code | Auto-uppercase, enable button at 6+ characters |
| Tap "Join Household" | Validate → Lookup household → Create membership → Dashboard |
| Invalid code | Show error: "Invalid invite code" |
| Already a member | Show error: "You're already in this household" |
| Tap "Scan QR Code" | Open camera, scan QR, extract code, auto-join |

**QR Scanning Availability:**

QR scanning is only shown when ALL conditions are met:
1. `invite_mode` config is set to `qr_enabled`
2. App is running on HTTPS (secure context)
3. Device is mobile (touch + small screen)

If any condition is not met, only the manual code entry is shown.

**Data Flow:**
1. Query `households` table by `invite_code` (case-insensitive using `.ilike()`)
2. If not found → show "Invalid invite code" error
3. If user already a member → show "You're already in this household" error
4. Create `household_members` entry with `role: 'member'`
5. Mark onboarding complete in user metadata
6. Navigate directly to Dashboard (skip Invite screen)

**Notes:**
- Joining users skip the Invite screen since they don't need to invite others
- The invite code is 12-character hexadecimal, case-insensitive
- QR codes encode the full join URL: `https://app.example.com/join/{invite_code}`

---

### 1.5 Screen 4: Category Template

This is the core onboarding screen. The aha moment is here — the user sees their money distributed across their life for the first time.

Two UX options are available for this screen:
- **Option 1: Form-based** — Traditional scrollable template with amount fields (current design)
- **Option 2: Chat-based** — Conversational flow with voice input via WhisperFlow (AI-first)

---

#### Option 1: Form-Based Template (Traditional)

**What the user sees:**

A scrollable list of pre-populated categories and sub-categories with amount fields. Income is at the top. The allocation summary is pinned at the top of the screen — prominent but compact.

```
┌─────────────────────────────────────────────┐
│  Income: ₹4,10,000  │  Allocated: ₹3,72,000│
│           Remaining: ₹38,000        Detail ▾│
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ INCOME                                       │
│  Salary 1                    [₹ _________ ]  │
│  Opening Balance             [₹ 0         ]  │
│  + Add                                       │
├─────────────────────────────────────────────┤
│ EMIs                                         │
│  Education Loan    [₹ _____ ] per [month ▾]  │
│  Car Loan          [₹ _____ ] per [month ▾]  │
│  Home Loan         [₹ _____ ] per [month ▾]  │
│  + Add                                       │
├─────────────────────────────────────────────┤
│ INSURANCE                                    │
│  Health Insurance  [₹ _____ ] per [month ▾]  │
│  Life Insurance    [₹ _____ ] per [month ▾]  │
│  + Add                                       │
├─────────────────────────────────────────────┤
│ SAVINGS                                      │
│  General Savings   [₹ _____ ] per [month ▾]  │
│  Trip              [₹ _____ ] per [month ▾]  │
│  Wedding           [₹ _____ ] per [month ▾]  │
│  + Add                                       │
├─────────────────────────────────────────────┤
│ FIXED EXPENSES                               │
│  Rent              [₹ _____ ] per [month ▾]  │
│  Maid/Help         [₹ _____ ] per [month ▾]  │
│  Internet          [₹ _____ ] per [month ▾]  │
│  Phone Bill        [₹ _____ ] per [month ▾]  │
│  + Add                                       │
├─────────────────────────────────────────────┤
│ VARIABLE EXPENSES                            │
│  Groceries         [₹ _____ ] per [month ▾]  │
│  Fuel              [₹ _____ ] per [month ▾]  │
│  Food Ordering     [₹ _____ ] per [month ▾]  │
│  Leisure           [₹ _____ ] per [month ▾]  │
│  Miscellaneous     [₹ _____ ] per [month ▾]  │
│  + Add                                       │
├─────────────────────────────────────────────┤
│ ONE-TIME                                     │
│  (empty)                                     │
│  + Add                                       │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│  [Save Draft]              [Freeze Plan →]   │
└─────────────────────────────────────────────┘
```

**Interactions:**

**Entering amounts:**
- Tap an amount field → numeric keypad opens
- Type amount → keypad auto-closes on "done" or when user taps the next field
- The sticky footer updates in real time as amounts are entered

**Period selector:**
- Default: "per month" (most sub-categories)
- Tap to change: month / quarter / year / custom
- If non-monthly: system shows calculated monthly amount below the field in small grey text (e.g., "₹24,000/year = ₹2,000/mo")
- If custom: additional fields appear for total months + start month

**Adding a sub-category:**
- Tap "+ Add" under any category
- Inline: a new row appears with an editable name field and amount field
- User types name, enters amount, done

**Deleting a sub-category:**
- Swipe left on any row → delete icon appears → tap to confirm
- Or: long press → "Delete" option

**Adding a new category:**
- At the bottom of the list: "+ Add category"
- User enters category name and type (dropdown: EMI / Insurance / Savings / Fixed / Variable / One-time / Custom)
- New category section appears in the list

**Editing a sub-category name:**
- Tap the name → it becomes editable → type → tap away to save

**Top bar — "Detail" toggle:**
- Tapping "Detail ▾" expands the top bar to show the full waterfall breakdown:
  ```
  Income              ₹4,10,000
  − EMIs              ₹1,14,975  →  ₹2,95,025
  − Insurance         ₹19,037   →  ₹2,75,988
  − Savings           ₹30,562   →  ₹2,45,426
  − Fixed             ₹82,775   →  ₹1,62,651
  − Variable          ₹54,600   →  ₹1,08,051
  − One-time          ₹37,631   →  ₹70,420
  Remaining           ₹70,420
  ```
- If over-allocated: the amount field that causes over-allocation is highlighted red. "Freeze Plan" button is disabled with message: "Reduce allocations to freeze."

**Save Draft:**
- Saves current state. User can close the app and come back.
- On next login, they're taken back to this screen with their draft loaded.
- Dashboard is accessible but shows a banner: "Your plan is in draft. Finish setting it up →"

**Freeze Plan:**
- Finalizes the plan for the current month.
- Confirmation: "Freeze your plan for [Month Year]? You can still edit later — changes will be tracked."
- On confirm: plan status = frozen. User lands on the dashboard.

---

#### Option 2: Chat-Based Template (AI-First with WhisperFlow) — NOT YET BUILT

> **Status: PLANNED — Not yet implemented.** Only Option 1 (form-based) is currently built. The Category Template is now integrated into the Budget Tab rather than being a separate onboarding screen. Users go through onboarding (Phone → OTP → Name → Household) and then set up their first budget in the Budget tab.

Instead of a form, My2cents guides the user through a conversation. Voice-first via WhisperFlow integration, with keyboard fallback.

**Why this approach:**
- Less intimidating than a 20-field form
- Feels like talking to a person, not filling forms
- Voice input is faster than tapping 15+ fields
- Creates delight through animated visual feedback
- The aha moment is preserved as an animated reveal at the end

**What the user sees:**

A chat interface with Finny asking questions one at a time. As the user responds, cards animate in showing their allocations. A running total is always visible at the top.

```
┌─────────────────────────────────────────────┐
│  ₹0                                         │
│  ──────────────────                         │
│  Let's build your plan                      │
│                                             │
│  Finny: What's your monthly                 │
│         take-home income? 💰                │
│                                             │
│                                             │
│         🎤                                  │
│  [Tap to speak or type]                     │
│                                             │
└─────────────────────────────────────────────┘
```

**User speaks:** "Two lakhs"

```
┌─────────────────────────────────────────────┐
│                                    ┌──────┐ │
│  ₹2,00,000                         │ +2L  │ │
│  ──────────────────                │ You  │ │
│  Income                            └──────┘ │
│                                             │
│  Finny: Nice! Anyone else earning           │
│         in the household?                   │
│                                             │
│         🎤                                  │
│  [Tap to speak or type]                     │
│                                             │
└─────────────────────────────────────────────┘
```

**User:** "Wife earns 80k"

```
┌─────────────────────────────────────────────┐
│                           ┌──────┐ ┌──────┐ │
│  ₹2,80,000 ✨             │ +2L  │ │+80K  │ │
│  ──────────────────       │ You  │ │Partner│
│  Income                   └──────┘ └──────┘ │
│                                             │
│  Finny: ₹2.8L coming in! 🎉                 │
│         Any EMIs? Car, home, education?     │
│                                             │
│         🎤                                  │
│  [Tap to speak or type]      [No EMIs →]    │
│                                             │
└─────────────────────────────────────────────┘
```

**Conversation Flow:**

The conversation follows this sequence with smart skip logic:

```
INCOME
├─ "What's your monthly take-home?"
├─ "Anyone else earning in the household?"
└─ (Skip if user says "just me" or "no")

EMIs
├─ "Any EMIs? Car loan, home loan, education?"
├─ (If yes) "How much?" → "Any other EMIs?"
└─ (Repeat until "no" or user taps [No more →])

FIXED EXPENSES
├─ "Do you pay rent, or own your place?"
├─ (If rent) "How much?"
├─ "Any household help? Maid, cook, driver?"
├─ "Internet and phone bills — roughly how much together?"
└─ "Any other fixed monthly expenses?"

SAVINGS (positioned as a positive question)
├─ "How much do you want to save each month?"
├─ "Any specific goals? Trip, wedding, emergency fund?"
└─ (Creates sub-categories based on answers)

VARIABLE EXPENSES
├─ "Groceries — roughly how much per month?"
├─ "Food delivery — Swiggy, Zomato?"
├─ "Fuel for car or bike?"
├─ "Entertainment, outings, subscriptions?"
└─ "Anything else that varies month to month?"

FINAL REVEAL
└─ "Here's your money plan!" → Animated waterfall
```

**Cards animate in as user answers:**

When user says "Rent 30k, maid 5k, internet 1500", three cards fly in:

```
┌─────────────────────────────────────────────┐
│  FIXED EXPENSES                             │
│  ┌────────┐ ┌────────┐ ┌────────┐          │
│  │ 🏠     │ │ 🧹     │ │ 📶     │          │
│  │ Rent   │ │ Maid   │ │Internet│          │
│  │ 30K    │ │ 5K     │ │ 1.5K   │          │
│  └────────┘ └────────┘ └────────┘          │
│                                             │
│  Monthly fixed: ₹36,500                     │
└─────────────────────────────────────────────┘
```

**The Aha Moment — Final Reveal:**

After all questions, an animated waterfall reveals the complete plan:

```
┌─────────────────────────────────────────────┐
│                                             │
│  YOUR MONEY PLAN ✨                         │
│                                             │
│  Income           ₹2,80,000                 │
│  ████████████████████████████  100%         │
│                                             │
│  − EMIs           ₹18,000                   │
│  ███                           6%           │
│                                             │
│  − Fixed          ₹36,500                   │
│  █████                         13%          │
│                                             │
│  − Savings        ₹25,000                   │
│  ████                          9%           │
│                                             │
│  − Variable       ₹32,000                   │
│  █████                         11%          │
│                                             │
│  ════════════════════════════════           │
│  Remaining        ₹1,68,500    🎉           │
│  ████████████████              60%          │
│                                             │
│  [✎ Edit Plan]        [Freeze Plan →]       │
│                                             │
└─────────────────────────────────────────────┘
```

**Voice Input Parsing (WhisperFlow + LLM):**

| User Says | AI Parses As |
|-----------|--------------|
| "two lakhs" / "2L" / "2,00,000" | ₹2,00,000 |
| "eighteen thousand" / "18k" / "18 hazar" | ₹18,000 |
| "wife earns" / "spouse" / "partner's salary" | Creates "Partner Salary" sub-category |
| "yearly 24 thousand" / "24k per year" | ₹2,000/month (auto-converts) |
| "Swiggy Zomato around 5k" | Maps to "Food Ordering" ₹5,000 |
| "SIP 10k" / "mutual funds" | Maps to Savings |
| Unknown: "Spotify 119" | Asks: "Should I add this under Fixed or Variable?" |

**Interactions:**

| Action | Behavior |
|--------|----------|
| Tap mic (🎤) | WhisperFlow starts listening, transcribes + parses |
| Type in text field | Keyboard fallback, same parsing |
| Tap [No EMIs →] / [Skip →] | Skips current category, moves to next |
| Tap a card | Edit that specific item |
| Say "actually 25k for rent" | Updates the rent card mid-conversation |
| Say "remove maid" | Deletes that card |
| Tap [✎ Edit Plan] at reveal | Switches to Option 1 (form view) for manual edits |

**Error Handling:**

| Scenario | Handling |
|----------|----------|
| Voice not recognized | "I didn't catch that. Could you say it again?" + show keyboard |
| Ambiguous amount | "Did you mean ₹5,000 or ₹50,000?" with tap options |
| Unknown category | "Where should I put [X]?" with category options |
| Over-allocation mid-flow | Running total shows red, Finny says "That's more than your income — want to adjust?" |
| User wants to go back | "Go back" or swipe right to revisit previous question |

**Draft & Resume:**

- Conversation state is auto-saved after each answer
- If user closes app mid-conversation, they resume from the last question
- Cards already entered are preserved

**Freeze Plan:**

Same as Option 1:
- Finalizes the plan for the current month
- Confirmation: "Freeze your plan for [Month Year]?"
- On confirm: plan status = frozen, user lands on dashboard

---

### 1.6 Dashboard Landing (Post-Onboarding)

**What the user sees after freezing:**
- Month overview: income, allocated, spent (₹0 if fresh), remaining
- Category-wise bars showing budget vs spent (all green at start)
- Floating action button (FAB): "+" for recording a transaction
- If savings buckets are relevant (determined later when user first interacts with bucket features): a checklist nudge appears

**What the user sees if plan is in draft:**
- Banner: "Finish your plan to start tracking →"
- Dashboard shows the draft plan summary but no transaction recording is available
- FAB is disabled or hidden until plan is frozen

---

### 1.7 Partner/Member Joining

Partners or other household members can join via **invite code** (primary method) or **QR scan** (optional).

#### Option A: Invite Code (Primary Method)

**How it works:**
1. Primary user shares the invite code via WhatsApp, SMS, or any messaging app
2. Partner opens My2Cents app → Sign in with phone + OTP → Enter name
3. On Household screen, partner selects "Join Existing" tab
4. Partner enters the invite code → taps "Join Household"
5. Partner lands on the Dashboard

**The invite code is accessible from:**
- Invite screen (shown after creating a household during onboarding)
- Profile panel → Household section → "Copy" button

#### Option B: QR Code Scan (Optional)

**Prerequisites for QR:**
- App must be configured with `invite_mode: qr_enabled` (see Section 1.9)
- App must be hosted on HTTPS (not localhost)
- Scanning device must be mobile

**How it works:**
1. Primary user opens Profile panel → shows QR code in Invite section
2. Partner scans QR with their phone camera
3. QR encodes URL: `https://app.example.com/join/{invite_code}`
4. Partner is redirected to My2Cents → Sign in → Name → auto-joins

**What happens after joining:**
- Partner is added as a household member (role: `member`)
- They see the same categories, plan, and transactions
- They can immediately record transactions
- If they have income to add: they go to the plan → add an income sub-category

**Time to complete:** Under 1 minute.

---

### 1.8 Edge Cases

| Scenario | Handling |
|----------|----------|
| User tries to record a transaction before freezing the plan | Not allowed. FAB is disabled. Banner prompts: "Finish your plan to start tracking →" |
| User tries to freeze with over-allocated plan | Not allowed. "Freeze Plan" button disabled. The over-allocating field is highlighted red. Message: "Reduce allocations to freeze." |
| Partner joins after plan is frozen | Partner sees existing plan. Can add their income as a new sub-category under Income. Plan can be revised (creates a new version). |
| User wants to change a sub-category's category type (e.g., moved "Phone Bill" from Fixed to Variable) | Allowed anytime. Change is applied going forward. Historical transactions stay tagged to the sub-category regardless of which category it sits under. |
| User re-categorizes a past transaction | Allowed. User edits the transaction and picks a different sub-category. Budget actuals update accordingly. |
| User tries to freeze with no income entered | Blocked. System prompts: "Add at least one income source to freeze your plan." |
| User has no EMIs, no insurance, no savings | They delete those sub-categories from the template. Empty categories collapse/hide from the dashboard. |
| Returning user — new month | Smart copy flow generates a new plan from last month. Covered in the Planning user journey (Section 3). |
| User closes app mid-onboarding at category template | Draft auto-saved. On next login, they resume from where they left off. |
| QR code expires | QR codes don't expire. They encode a permanent household invite token. The primary user can regenerate a new QR from settings if needed (invalidates the old one). |
| User tries to join with invalid code | Show error: "Invalid invite code". User can retry with correct code. |
| User tries to join household they're already in | Show error: "You're already in this household". Prevent duplicate membership. |

---

### 1.9 Configuration Settings

The onboarding flow behavior can be configured via `app/src/config/app.config.ts`. These settings control feature availability.

#### Authentication Settings

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `loginMethods` | array | `['phone_otp']` | Enabled login methods. Options: `phone_otp`, `email_otp`, `google` |
| `defaultCountryCode` | string | `+91` | Default country code for phone input |
| `countryFlag` | string | `🇮🇳` | Flag emoji displayed with country code |

**Future:** When `email_otp` or `google` are added to `loginMethods`, the login screen will show additional sign-in options.

#### Invite Settings

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `invite_mode` | enum | `code_only` | How invites work. Options: `code_only`, `qr_enabled` |

**Mode Behavior:**

| Mode | Invite Screen | Join Screen | Profile Panel |
|------|---------------|-------------|---------------|
| `code_only` | Shows invite code only | Manual code entry only | Shows invite code only |
| `qr_enabled` | Shows code + QR (HTTPS only) | Code entry + QR scan (mobile + HTTPS) | Shows code + QR (HTTPS only) |

**QR Requirements:**
- `qr_enabled` mode AND
- App running on HTTPS (not localhost) AND
- For scanning: Mobile device with camera access

**Config File Location:** `app/src/config/app.config.ts`

**Reference:** See `docs/settings-registry.md` for full settings documentation.

---

## 2. Field Validations & Functional Specifications

This section provides developer-ready specifications for all input fields in the onboarding flow.

### 2.1 Phone Number Field (Screen 1)

**Field Properties:**

| Property | Value |
|----------|-------|
| Field ID | `phone_number` |
| Type | `tel` |
| Max Length | 10 digits (excluding country code) |
| Keyboard | Numeric keypad |
| Autocomplete | `tel-national` |
| Font | JetBrains Mono (monospace) |

**Validation Rules:**

| Rule | Condition | Error Message |
|------|-----------|---------------|
| Required | Field is empty | "Please enter your phone number" |
| Length | Length ≠ 10 digits | "Phone number must be 10 digits" |
| Format | Does not match `/^[6-9]\d{9}$/` | "Enter a valid Indian mobile number" |
| Numeric only | Contains non-numeric characters | Prevent input (don't allow typing) |

**Input Behavior:**

```
Allowed characters: 0-9 only
Auto-format display: "98765 43210" (space after 5th digit)
Stored value: "9876543210" (no spaces, no country code)
Full value for API: "+919876543210"
```

**Real-time Validation:**
- Validate on blur (when user taps away)
- Validate on submit (tap "Send OTP")
- Do NOT validate on every keystroke (annoying)

**Error Display:**
- Inline error text below input field
- Error text color: `#ef4444` (danger red)
- Input border changes to red
- Error clears when user starts typing again

**Code Example:**

```typescript
const PHONE_REGEX = /^[6-9]\d{9}$/;

function validatePhone(phone: string): ValidationResult {
  const digits = phone.replace(/\D/g, '');

  if (!digits) {
    return { valid: false, error: 'Please enter your phone number' };
  }

  if (digits.length !== 10) {
    return { valid: false, error: 'Phone number must be 10 digits' };
  }

  if (!PHONE_REGEX.test(digits)) {
    return { valid: false, error: 'Enter a valid Indian mobile number' };
  }

  return { valid: true, value: `+91${digits}` };
}
```

---

### 2.2 OTP Field (Screen 1b)

**Field Properties:**

| Property | Value |
|----------|-------|
| Field ID | `otp_digit_1` through `otp_digit_6` |
| Type | `text` (with `inputmode="numeric"`) |
| Max Length | 1 character per box |
| Total Boxes | 6 |
| Keyboard | Numeric keypad |
| Font | JetBrains Mono, 28px, font-weight 600 |

**Validation Rules:**

| Rule | Condition | Error Message |
|------|-----------|---------------|
| Required | Any box is empty | "Please enter the complete code" |
| Numeric only | Contains non-numeric | Prevent input |
| Complete | All 6 boxes filled | Enable "Verify" button |

**Input Behavior:**

```
On digit entry:
  → Store digit in current box
  → Auto-focus next box
  → If last box, enable submit button

On backspace:
  → If current box empty, move focus to previous box
  → If current box has value, clear it

On paste (6 digits):
  → Distribute digits across all 6 boxes
  → Auto-focus last box
  → Auto-submit after 300ms delay
```

**Auto-submit Logic:**

```typescript
function handleOTPComplete(otp: string) {
  if (otp.length === 6 && /^\d{6}$/.test(otp)) {
    // Brief delay for UX (user sees all boxes filled)
    setTimeout(() => {
      submitOTP(otp);
    }, 300);
  }
}
```

**Error State:**

```css
/* Apply to all 6 boxes on error */
.otp-input.error {
  border-color: #ef4444;
  background: rgba(239, 68, 68, 0.05);
  animation: shake 0.5s ease;
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  20%, 60% { transform: translateX(-6px); }
  40%, 80% { transform: translateX(6px); }
}
```

**OTP Verification Flow:**

```typescript
async function verifyOTP(phone: string, otp: string): Promise<VerifyResult> {
  try {
    const { data, error } = await supabase.auth.verifyOtp({
      phone: phone,
      token: otp,
      type: 'sms'
    });

    if (error) {
      return {
        success: false,
        error: 'Incorrect code. Please try again.',
        shouldShake: true
      };
    }

    // Check if new user or returning
    const isNewUser = !data.user?.user_metadata?.onboarding_complete;

    return {
      success: true,
      isNewUser,
      user: data.user
    };
  } catch (e) {
    return {
      success: false,
      error: 'Something went wrong. Please try again.',
      shouldShake: false
    };
  }
}
```

**Resend OTP Logic:**

```typescript
const RESEND_COOLDOWN_SECONDS = 30;
const MAX_RESEND_ATTEMPTS = 3;
const LOCKOUT_MINUTES = 15;

interface ResendState {
  attemptsRemaining: number;
  cooldownEndsAt: number | null;
  lockedUntil: number | null;
}

function canResend(state: ResendState): boolean {
  const now = Date.now();

  if (state.lockedUntil && now < state.lockedUntil) {
    return false; // Locked out
  }

  if (state.cooldownEndsAt && now < state.cooldownEndsAt) {
    return false; // Still in cooldown
  }

  return state.attemptsRemaining > 0;
}
```

---

### 2.3 Name Field (Screen 2)

**Field Properties:**

| Property | Value |
|----------|-------|
| Field ID | `display_name` |
| Type | `text` |
| Min Length | 2 characters |
| Max Length | 30 characters |
| Keyboard | Default (alphabetic) |
| Autocapitalize | `words` |
| Placeholder | "e.g., Varshi" |
| Font | Poppins, 16px |

**Validation Rules:**

| Rule | Condition | Error Message |
|------|-----------|---------------|
| Required | Field is empty | "Please enter your name" |
| Min length | Length < 2 | "Name must be at least 2 characters" |
| Max length | Length > 30 | Prevent input beyond 30 chars |
| Valid chars | Contains numbers or special chars | "Name can only contain letters and spaces" |

**Allowed Characters:**

```typescript
const NAME_REGEX = /^[a-zA-Z\s]+$/;

// Also allow Unicode letters for Indian names
const NAME_REGEX_UNICODE = /^[\p{L}\s]+$/u;
```

**Input Behavior:**

```
On input:
  → Trim leading/trailing whitespace on submit
  → Allow single spaces between words
  → Collapse multiple spaces to single
  → Capitalize first letter of each word on blur (optional)
```

**Code Example:**

```typescript
function validateName(name: string): ValidationResult {
  const trimmed = name.trim().replace(/\s+/g, ' ');

  if (!trimmed) {
    return { valid: false, error: 'Please enter your name' };
  }

  if (trimmed.length < 2) {
    return { valid: false, error: 'Name must be at least 2 characters' };
  }

  if (!/^[\p{L}\s]+$/u.test(trimmed)) {
    return { valid: false, error: 'Name can only contain letters and spaces' };
  }

  return { valid: true, value: trimmed };
}
```

---

### 2.4 Household Name Field (Screen 3)

**Field Properties:**

| Property | Value |
|----------|-------|
| Field ID | `household_name` |
| Type | `text` |
| Min Length | 2 characters |
| Max Length | 40 characters |
| Keyboard | Default (alphabetic) |
| Autocapitalize | `words` |
| Placeholder | "e.g., Sharma Family" |
| Helper Text | "You can change this later in settings" |
| Font | Poppins, 16px |

**Validation Rules:**

| Rule | Condition | Error Message |
|------|-----------|---------------|
| Required | Field is empty | "Please enter a household name" |
| Min length | Length < 2 | "Name must be at least 2 characters" |
| Max length | Length > 40 | Prevent input beyond 40 chars |
| Valid chars | Only letters, numbers, spaces, hyphens, ampersands | "Name contains invalid characters" |

**Allowed Characters:**

```typescript
// More permissive than personal name - allows numbers, hyphens, &
const HOUSEHOLD_NAME_REGEX = /^[\p{L}\p{N}\s\-&]+$/u;

// Examples that should pass:
// "Sharma Family"
// "Donda-Varshi"
// "The Kapoors"
// "Raj & Priya"
// "Apartment 4B"
```

**Code Example:**

```typescript
function validateHouseholdName(name: string): ValidationResult {
  const trimmed = name.trim().replace(/\s+/g, ' ');

  if (!trimmed) {
    return { valid: false, error: 'Please enter a household name' };
  }

  if (trimmed.length < 2) {
    return { valid: false, error: 'Name must be at least 2 characters' };
  }

  if (!/^[\p{L}\p{N}\s\-&]+$/u.test(trimmed)) {
    return { valid: false, error: 'Name contains invalid characters' };
  }

  return { valid: true, value: trimmed };
}
```

---

### 2.5 Invite Code Field (Join Household - Screen 3)

**Field Properties:**

| Property | Value |
|----------|-------|
| Field ID | `invite_code` |
| Type | `text` |
| Min Length | 6 characters |
| Max Length | 20 characters |
| Keyboard | Default (alphanumeric) |
| Autocapitalize | `characters` (uppercase) |
| Placeholder | "e.g., ABC123" |
| Font | JetBrains Mono (monospace), tracking-widest |

**Validation Rules:**

| Rule | Condition | Error Message |
|------|-----------|---------------|
| Required | Field is empty | "Please enter an invite code" |
| Min length | Length < 6 | "Please enter a valid invite code" |
| Not found | Code doesn't exist in database | "Invalid invite code" |
| Already member | User already in this household | "You're already in this household" |

**Input Behavior:**

```
On input:
  → Auto-convert to uppercase
  → Allow alphanumeric characters only
  → Enable "Join Household" button at 6+ characters

On submit:
  → Query households table with case-insensitive match (.ilike())
  → If found, check if user is already a member
  → If not member, create household_members entry
```

**Code Example:**

```typescript
async function joinHousehold(inviteCode: string): Promise<JoinResult> {
  const code = inviteCode.trim().toUpperCase();

  if (code.length < 6) {
    return { success: false, error: 'Please enter a valid invite code' };
  }

  // Case-insensitive lookup
  const { data: household } = await supabase
    .from('households')
    .select('id')
    .ilike('invite_code', code)
    .single();

  if (!household) {
    return { success: false, error: 'Invalid invite code' };
  }

  // Check if already a member
  const { data: existing } = await supabase
    .from('household_members')
    .select('id')
    .eq('household_id', household.id)
    .eq('user_id', userId)
    .single();

  if (existing) {
    return { success: false, error: "You're already in this household" };
  }

  // Create membership
  await supabase.from('household_members').insert({
    household_id: household.id,
    user_id: userId,
    role: 'member'
  });

  return { success: true, householdId: household.id };
}
```

---

### 2.6 Amount Fields (Category Template - Screen 4)

**Field Properties:**

| Property | Value |
|----------|-------|
| Type | `text` (with `inputmode="numeric"`) |
| Keyboard | Numeric with decimal |
| Min Value | 0 |
| Max Value | 99,99,99,999 (₹99.99 Cr) |
| Prefix | ₹ (displayed, not in value) |
| Font | JetBrains Mono (monospace) |
| Alignment | Right-aligned |

**Display Format:**

```typescript
// Indian number formatting (lakhs/crores)
function formatIndianCurrency(value: number): string {
  const formatted = value.toLocaleString('en-IN');
  return `₹${formatted}`;
}

// Examples:
// 1000 → "₹1,000"
// 100000 → "₹1,00,000"
// 1500000 → "₹15,00,000"
// 10000000 → "₹1,00,00,000"
```

**Input Behavior:**

```
Allowed input: 0-9, single decimal point
On input:
  → Strip non-numeric (except decimal)
  → Max 2 decimal places
  → Format with Indian comma separators on blur
  → Store raw number value internally

Shorthand support (optional enhancement):
  → "5k" → 5000
  → "1.5L" → 150000
  → "2.5L" → 250000
```

**Validation Rules:**

| Rule | Condition | Error Message |
|------|-----------|---------------|
| Numeric | Non-numeric characters | Prevent input |
| Non-negative | Value < 0 | Prevent input |
| Max value | Value > 99,99,99,999 | "Amount too large" |
| Decimal places | More than 2 decimal places | Truncate to 2 |

**Code Example:**

```typescript
function parseAmount(input: string): number | null {
  // Remove currency symbol and commas
  let cleaned = input.replace(/[₹,\s]/g, '');

  // Handle shorthand (k, L, Cr)
  const shorthandMatch = cleaned.match(/^([\d.]+)\s*(k|l|cr)?$/i);
  if (shorthandMatch) {
    const num = parseFloat(shorthandMatch[1]);
    const suffix = (shorthandMatch[2] || '').toLowerCase();

    switch (suffix) {
      case 'k': return num * 1000;
      case 'l': return num * 100000;
      case 'cr': return num * 10000000;
      default: return num;
    }
  }

  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? null : Math.round(parsed * 100) / 100;
}

function validateAmount(input: string): ValidationResult {
  const amount = parseAmount(input);

  if (amount === null) {
    return { valid: false, error: 'Enter a valid amount' };
  }

  if (amount < 0) {
    return { valid: false, error: 'Amount cannot be negative' };
  }

  if (amount > 999999999) {
    return { valid: false, error: 'Amount too large' };
  }

  return { valid: true, value: amount };
}
```

---

### 2.7 Button States

All primary action buttons follow these states:

**Default State:**
```css
.btn-primary {
  background: linear-gradient(135deg, #3969E7 0%, #6B85EC 100%);
  color: #FFFFFF;
  cursor: pointer;
}
```

**Disabled State (validation not passed):**
```css
.btn-primary:disabled {
  background: #e5e7eb;
  color: #9ca3af;
  cursor: not-allowed;
}
```

**Loading State (API call in progress):**
```css
.btn-primary.loading {
  background: linear-gradient(135deg, #3969E7 0%, #6B85EC 100%);
  color: transparent;
  position: relative;
  pointer-events: none;
}

.btn-primary.loading::after {
  content: '';
  position: absolute;
  width: 20px;
  height: 20px;
  border: 2px solid #ffffff;
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
```

**Button Enable Logic:**

| Screen | Button Enabled When |
|--------|---------------------|
| Phone Entry | Phone number is 10 valid digits |
| OTP Entry | All 6 digits entered |
| Your Name | Name ≥ 2 characters, valid format |
| Household Name | Name ≥ 2 characters, valid format |
| Category Template | Income > 0 AND Allocated ≤ Income |

---

### 2.8 Error Message Component

**Structure:**

```html
<div class="error-alert">
  <span class="error-alert-icon">⚠️</span>
  <span class="error-alert-text">Error message here</span>
</div>
```

**Styles:**

```css
.error-alert {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 16px;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.2);
  border-radius: 8px;
  margin-bottom: 24px;
}

.error-alert-text {
  font-size: 14px;
  color: #ef4444;
  font-weight: 500;
}
```

**Inline Field Error:**

```html
<div class="form-field">
  <label class="form-label">Phone Number</label>
  <input class="input error" type="tel" value="12345">
  <span class="form-helper error">Phone number must be 10 digits</span>
</div>
```

```css
.input.error {
  border-color: #ef4444;
}

.form-helper.error {
  color: #ef4444;
}
```

---

### 2.9 API Error Handling

**Common API Errors:**

| Error Code | User Message | Action |
|------------|--------------|--------|
| `network_error` | "No internet connection. Please check your network." | Show inline, retry button |
| `rate_limited` | "Too many attempts. Please try again in X minutes." | Disable button, show countdown |
| `invalid_otp` | "Incorrect code. Please try again." | Shake OTP inputs, clear values |
| `expired_otp` | "Code expired. Please request a new one." | Enable resend, clear inputs |
| `phone_not_found` | — | Treat as new user, proceed normally |
| `server_error` | "Something went wrong. Please try again." | Show inline, retry button |

**Error Handling Code:**

```typescript
async function handleAPIError(error: APIError): Promise<UserFacingError> {
  switch (error.code) {
    case 'NETWORK_ERROR':
      return {
        message: 'No internet connection. Please check your network.',
        action: 'retry'
      };

    case 'RATE_LIMITED':
      const waitMinutes = Math.ceil(error.retryAfter / 60);
      return {
        message: `Too many attempts. Please try again in ${waitMinutes} minutes.`,
        action: 'wait',
        waitSeconds: error.retryAfter
      };

    case 'INVALID_OTP':
      return {
        message: 'Incorrect code. Please try again.',
        action: 'shake'
      };

    default:
      return {
        message: 'Something went wrong. Please try again.',
        action: 'retry'
      };
  }
}
```
