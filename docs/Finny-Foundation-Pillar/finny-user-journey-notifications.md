# Notifications — User Journey & Design Doc

## Objectives

1. **Build habit** — Make daily expense tracking a reflex through gamified, Duolingo-style nudges
2. **Keep users informed** — Surface feature releases so users discover and adopt new capabilities
3. **Drive budget discipline** — Remind users to create and freeze monthly budgets on time
4. **Re-engage inactive users** — Pull dormant users back through push notifications

## Notification Types Overview

| # | Type | Channel | Status |
|---|------|---------|--------|
| 1 | Release Updates | In-app carousel + Push notification | Defined |
| 2 | Expense Logging Reminders | Push notification | Defined |
| 3 | Budget Creation Reminders | Push notification | Not started |
| 4 | Add to Homescreen Prompt | In-app banner (not a notification) | Not started |
| 5 | Tutorials / How-to-use | In-app onboarding UX (not a notification) | Not started |

---

## 1. Release Updates

### Summary

Announce meaningful, user-facing features via an in-app carousel and push notification to pull inactive users back.

### Decisions

| Aspect | Decision |
|---|---|
| **What** | Announcement-worthy, user-facing features only |
| **In-app display** | "What's New" swipeable carousel — catchy title, description, visual, dismissable |
| **Tone** | Marketing, click-baity, attention-grabbing |
| **Multiple updates** | Carousel with one feature per slide |
| **Show once** | User sees each announcement once, then never again |
| **Push notification** | Yes — pull inactive users back ("X new features waiting for you") |
| **Audience** | All users |
| **Content storage** | Supabase table (add announcements without redeploying) |
| **CTA** | "Try it now" button that navigates to the feature + dismiss option |

### Architecture Notes

- Announcements stored in a Supabase table (title, description, image_url, cta_route, created_at)
- Track which announcements each user has seen (user_announcements_seen table or similar)
- Push notification for users who haven't opened the app since announcement was created

---

## 2. Expense Logging Reminders

### Summary

Duolingo-style gamified push notifications to nudge users into logging daily transactions. Two tracks based on user behavior.

### Design Principles

- **Full Duolingo energy.** Passive-aggressive, guilt-tripping, playful. One mode for everyone.
- **Every notification = Hook + Action.** Sassy line grabs attention, action line tells them what to do.
- **Varied CTAs.** Never just "log" — use: Record, Add, Track, Note down, Punch in, Jot down, Capture, Don't let it slip.
- **Tapping the notification** opens the app to the transaction entry screen, ideally pre-filled with the relevant sub-category.

### Track A: Zero Transactions Today — Escalating Daily Nudges

- Escalation resets only after a transaction is logged
- Multi-day ignoring = start the day already aggressive
- Day 1: friendly -> impatient -> guilt trip
- Day 3+: starts aggressive, gets unhinged

| Day | Time | Message |
|---|---|---|
| Day 1 | Morning (~10am) | "Good morning! Fresh day, fresh spends. **Tap to add your first expense.**" |
| Day 1 | Afternoon (~2pm) | "Half the day gone. Not a single rupee spent? **Capture your expenses.**" |
| Day 1 | Evening (~7pm) | "We've been waiting all day. Even chai counts. **Jot it down before you forget.**" |
| Day 1 | Night (~9pm) | "Fine. Guess today's expenses don't exist. **Prove us wrong — record them now.**" |
| Day 2 | Morning | "Day 2. Still nothing. We're worried. **Add yesterday's and today's spends.**" |
| Day 2 | Afternoon | "Two days of financial silence. Suspicious. **Track your expenses.**" |
| Day 2 | Night | "The spreadsheet is crying. Two days. Zero entries. **Punch them in. Now.**" |
| Day 3+ | Morning | "Day {X}. Oh look who's not tracking again. **Your expenses won't add themselves.**" |
| Day 3+ | Afternoon | "Day {X}. We're just a glorified icon on your phone. **Tap to record.**" |
| Day 3+ | Night | "Day {X}. We're not angry. Just disappointed. Actually, we're angry. **ADD. THEM. NOW.**" |

### Track B: Has Transactions — Contextual Nudges (max 2-3/day)

Smart, event-driven reminders based on existing data.

**Trigger types (data we have):**
- **Time-based:** Meal times (breakfast ~9am, lunch ~1pm, dinner ~8pm), end of day wrap-up
- **Sub-category silence:** Budget allocation exists but no transactions for X days
- **Behavioral:** Logged something hours ago then went quiet
- **Weekend:** Higher discretionary spend days, nudge more

**Two tiers for sub-category triggers:**
- **Tier 1: Predefined sub-categories** — custom sassy messages per sub-cat (below)
- **Tier 2: Custom sub-categories** — generic sassy messages

---

### Tier 1: Predefined Sub-Category Messages

#### Income

| Sub-category | Trigger | Message |
|---|---|---|
| Salary | Not logged, after 5th of month | "Salary day came and went. Did your boss forget? Or did you? **Record your salary income.**" |
| Business Income | Not logged in 30+ days | "Business income looking quiet. The tax man is still watching though. **Add your business income.**" |
| Rental Income | Not logged this month | "Your tenant living rent-free this month? **Track your rental income.**" |
| Freelance | Not logged in 30+ days | "The hustle is resting? **Punch in your freelance income.**" |
| Investments | Not logged in 30+ days | "Investment returns? Dividends? Anything? **Note down your investment income.**" |

#### EMI

| Sub-category | Trigger | Message |
|---|---|---|
| Home Loan EMI | Not logged, after 7th of month | "The bank never forgets. Did you pay your home loan? **Record your EMI payment.**" |
| Car Loan EMI | Same | "Technically the bank's car right now. **Track your car loan EMI.**" |
| Education Loan | Same | "Education loan EMI — the gift that keeps on taking. **Punch in your payment.**" |
| Personal Loan | Same | "Your bank balance is sweating. **Add your personal loan EMI.**" |

#### Insurance

| Sub-category | Trigger | Message |
|---|---|---|
| Health Insurance | Not logged this month | "Living dangerously, are we? **Record your health insurance premium.**" |
| Life Insurance | Same | "Future you is counting on present you. **Add your life insurance premium.**" |
| Vehicle Insurance | Not logged in 60+ days | "Your car is technically naked right now. **Capture your vehicle insurance payment.**" |

#### Savings

| Sub-category | Trigger | Message |
|---|---|---|
| General Savings | Not logged this month | "Future you is writing a strongly worded letter. **Track your savings transfer.**" |
| Emergency Fund | Same | "Emergencies don't RSVP. **Add your emergency fund contribution.**" |
| Investment/SIP | Same | "Your mutual fund is feeling ghosted. **Record your SIP payment.**" |
| Vacation Fund | Same | "Guess we're staycationing again. **Note down your vacation fund deposit.**" |

#### Fixed

| Sub-category | Trigger | Message |
|---|---|---|
| Rent | Not logged, after 5th | "Your landlord called. Just kidding. But did you pay? **Record your rent.**" |
| Internet | Not logged this month | "How are you even reading this? **Add your internet bill.**" |
| Phone Bill | Same | "Bold move for someone holding a phone right now. **Punch in your phone bill.**" |
| Maid/Help | Same | "Did the maid quit or did you just forget? **Track your maid payment.**" |
| Society Maintenance | Same | "Your RWA uncle is watching. **Note down your maintenance payment.**" |
| Subscriptions | Same | "Netflix is still charging you. Just saying. **Capture your subscription payment.**" |

#### Variable

| Sub-category | Trigger | Message |
|---|---|---|
| Groceries | No txn in 10+ days | "Surviving on air? No groceries in {X} days. **Add your grocery spends.**" |
| Electricity | Not logged this month | "Lights still on? **Punch in your electricity bill.**" |
| Water | Same | "Still hydrating though? **Record your water bill.**" |
| Fuel | No txn in 20+ days | "Is the car running on vibes? **Track your fuel expenses.**" |
| Food Ordering | No txn in 7+ days | "A whole week without ordering in? Sure about that? **Jot down your food orders.**" |
| Dining Out | No txn in 14+ days | "Home chef mode or just forgot? **Add your dining expenses.**" |
| Shopping | No txn in 20+ days | "No shopping in {X} days? Who even are you? **Capture your shopping spends.**" |
| Entertainment | No txn in 20+ days | "Zero entertainment spend? You okay? **Note down your entertainment expenses.**" |
| Personal Care | Not logged this month | "Self-care is NOT optional. **Track your personal care expenses.**" |
| Medical | — | No reminders (too sensitive) |
| Transport | No txn in 10+ days | "Teleporting, are we? **Punch in your transport costs.**" |
| Miscellaneous | No txn in 14+ days | "The misc category is lonely. **Add your miscellaneous spends.**" |

### Tier 2: Custom Sub-Category Messages (Generic)

| Trigger | Message |
|---|---|
| No txn in X days | "No {sub-cat name} in {X} days. Forgot or avoiding it? **Add your {sub-cat name} expenses.**" |
| Longer silence | "{sub-cat name} gathering dust. {X} days and counting. **Don't let it slip — record it.**" |

---

## 3. Budget Creation Reminders

> **Status:** Not started. To be defined.

Reminders at end of month / start of month to create and freeze the budget plan.

---

## 4. Add to Homescreen Prompt

> **Status:** Not started. To be defined.

In-app banner using `beforeinstallprompt` browser event. Not a push notification — user must be in the app.

---

## 5. Tutorials / How-to-Use

> **Status:** Not started. To be defined.

In-app onboarding UX (tooltips, coach marks, guided walkthrough). Not a notification.

---

## Architecture (To Be Designed)

Pending — will be designed after all notification types are defined. Key areas:
- Push subscription storage (Supabase table)
- Service worker push event handler
- Scheduling mechanism (pg_cron / Supabase Edge Functions / Vercel cron)
- Announcement content table schema
- User notification preferences
- Notification delivery tracking (sent, opened, dismissed)
