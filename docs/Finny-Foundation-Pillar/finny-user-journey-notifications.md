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
| 3 | Budget Creation Reminders | Push notification | Defined |
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

### Summary

Escalating push notifications to drive users to create and freeze their monthly budget. Two tracks: one for users with no budget at all (Track A), one for users with a draft that's not yet frozen (Track B). Clone shortcut for returning users is marketed as the primary CTA — reduce perceived effort to near zero.

### Design Principles

- **Escalation mirrors real urgency.** Early month = gentle. Mid month = serious. Late month = pivot to next month.
- **Morning = inspire, set intention.** Evening = close the loop, get it done.
- **2 notifications/day max.** Morning (~9am) + Evening (~8pm). Respects the user.
- **Clone is the hero.** For returning users, every notification sells the one-tap clone. Reduce perceived effort to near zero. "One tap away" is the recurring CTA.
- **Draft ≠ No budget.** Users who started a draft get a gentler, "almost there" track — never punish progress.
- **Late month = pivot forward.** After day 25, stop shaming about this month. Combine "review what happened" + "plan next month."
- **Same Duolingo energy as Type 2.** Passive-aggressive, guilt-tripping, playful. Consistent personality across all notification types.

### Prerequisites

System must know:
1. Whether a **frozen budget** exists for current month
2. Whether a **draft** exists (started but not frozen)
3. Whether **last month had a frozen budget** (enables clone CTA)
4. Whether **transactions exist** without a budget (spending-without-a-plan angle)
5. **Transaction totals** (₹amount, count) for contextual messages

### Track A: No Budget — Escalating Phases

Track A fires when the user has **NO budget** (not even a draft) for the current month.

**Two modifiers applied as overlays on any phase:**

| Modifier | Condition | Effect |
|---|---|---|
| **Clone (M-Clone)** | User had a frozen budget last month | Replace generic CTA with clone-specific message — sell the one-tap shortcut |
| **Transactions (M-Txn)** | User has logged transactions this month with no budget | Add spending-without-a-plan angle with actual ₹ amounts |

---

#### Phase 1: Proactive (Last 3-5 days of previous month)

Only fires if user had a budget THIS month (we know they're engaged). Goal: get ahead of the curve.

| Time | Message |
|---|---|
| Morning | "Next month is {X} days away. Get ahead — **plan your budget before the rush.**" |
| Evening | "Month's wrapping up. Winning move? **Start next month's budget tonight.**" |

**With Clone modifier:**

| Time | Message |
|---|---|
| Morning | "Next month is {X} days away. **Clone this month's budget in one tap** and tweak from there." |
| Evening | "Month's wrapping up. **One tap to clone → quick tweaks → done.** That's it." |

---

#### Phase 2: Grace Period (Days 1-3)

Fresh start energy. Light, positive, zero pressure.

| Day | Time | Message |
|---|---|---|
| 1 | Morning | "Happy new month! Fresh start, fresh budget. **10 minutes to set your plan.**" |
| 1 | Evening | "Day 1 isn't over yet. **Create your budget before the spending starts.**" |
| 2 | Morning | "Morning! Quick question — where's your budget? **Tap to create one now.**" |
| 2 | Evening | "Two days in, zero budget. **Give your money a job tonight.**" |
| 3 | Morning | "Day 3. Grace period's ending. **Set up your budget today.**" |
| 3 | Evening | "Last chance before we start nagging. **Create your monthly plan.**" |

**With Clone modifier:**

| Day | Time | Message |
|---|---|---|
| 1 | Morning | "Happy new month! **Clone last month's budget in one tap** — adjust and you're done." |
| 1 | Evening | "Day 1 isn't over yet. **One tap clone. Quick tweak. Budget done.** Easy." |
| 2 | Morning | "Morning! **Last month's plan is waiting.** One tap to clone, adjust the numbers, freeze. Done." |
| 2 | Evening | "Two days in. **Your old budget is one tap away.** Clone it, tweak it, freeze it." |
| 3 | Morning | "Day 3. **Clone + tweak = 5 minutes.** Your last budget is ready to go." |
| 3 | Evening | "Last call before we get pushy. **One tap clone. You know the drill.**" |

---

#### Phase 3: Nudge (Days 4-7)

Gentle push becomes firmer. A week without a budget is suspicious.

| Time | Message |
|---|---|
| Morning | "Week {X} and no budget. Your money is winging it. **Give it a plan.**" |
| Evening | "Another day without a budget. Not judging. Okay, slightly judging. **Tap to create.**" |

**With Clone modifier:**

| Time | Message |
|---|---|
| Morning | "Week {X}. **One tap to clone last month's budget.** Your money shouldn't wing it." |
| Evening | "Still no budget? **Last month's plan → one tap → done.** We timed it. Under 5 minutes." |

**With Transactions modifier:**

| Time | Message |
|---|---|
| Morning | "You've spent ₹{amount} this month with no budget. That's brave. **Create a plan before it gets scary.**" |
| Evening | "₹{amount} spent. ₹0 planned. Math isn't mathing. **Set your budget now.**" |

---

#### Phase 4: Urgency (Days 8-15)

Direct, no-nonsense. Half the month is gone.

| Time | Message |
|---|---|
| Morning | "Half the month. No budget. Your wallet called — it's stressed. **Create your plan now.**" |
| Evening | "We've been gentle. It's day {X}. **Make a budget or admit you like chaos.**" |

**With Clone modifier:**

| Time | Message |
|---|---|
| Morning | "Half the month gone. **Clone last month's budget — literally one tap.** Then tweak what changed." |
| Evening | "Day {X}. No budget. **One. Tap. Clone.** That's all we're asking." |

**With Transactions modifier:**

| Time | Message |
|---|---|
| Morning | "₹{amount} spent with zero planning. Would you drive blindfolded? **Budget. Now.**" |
| Evening | "You've logged {count} transactions. Great. Now imagine having a PLAN for them. **Create your budget.**" |

---

#### Phase 5: Intervention (Days 16-25)

Blunt. Duolingo-level passive-aggressive. We're past being polite.

| Time | Message |
|---|---|
| Morning | "Day {X}. More than half the month gone. No budget. We're not mad, we're concerned. **Tap to create.**" |
| Evening | "At this point we admire your commitment to financial chaos. **Prove us wrong — make a budget.**" |

**With Clone modifier:**

| Time | Message |
|---|---|
| Morning | "Day {X}. **Your last budget is RIGHT THERE. One tap.** Please. We're begging." |
| Evening | "One tap. That's all. **Clone → tweak → freeze.** Your future self will thank you." |

**With Transactions modifier:**

| Time | Message |
|---|---|
| Morning | "₹{amount} spent this month. No plan. No guardrails. **You're speedrunning financial regret.**" |
| Evening | "{count} transactions. {X} days. Zero budget. The math is giving 'yikes'. **Create one now.**" |

---

#### Phase 6: Month-End Pivot (Days 26-EOM)

Stop shaming about this month. Combine retrospective ("look what happened") with forward planning ("next month starts in X days"). This month is a write-off — channel the energy into next month.

| Time | Message |
|---|---|
| Morning | "This month is wrapping up. Let's be honest — no budget happened. **But next month? Fresh start. Plan it now.**" |
| Evening | "Month's almost over. Instead of regret, try action. **Start next month's budget tonight.**" |

**With Clone modifier:**

| Time | Message |
|---|---|
| Morning | "This month flew by. **Clone this month's spending into next month's budget** — one tap to get ahead." |
| Evening | "Forget this month. **One tap to clone your budget for next month.** Start fresh." |

**With Transactions modifier:**

| Time | Message |
|---|---|
| Morning | "You spent ₹{amount} this month unplanned. Learn from it — **plan next month now.** Review vs reality starts with a budget." |
| Evening | "This month: ₹{amount} spent, ₹0 budgeted. Next month doesn't have to be like this. **Create your plan.**" |

---

### Track B: Draft Exists, Not Frozen

Gentler track. User started but didn't finish. The hard part (planning) is done — they just need to freeze. Never punish progress.

Fires when: Draft budget exists for current month but **isn't frozen**.

| Day | Time | Message |
|---|---|---|
| 1 | Morning | "Your budget draft is ready and waiting. **One tap to freeze and you're set for the month.**" |
| 1 | Evening | "You did the planning. Now seal the deal. **Freeze your budget — takes 2 seconds.**" |
| 2 | Morning | "Draft's still sitting there. It's good to go! **Tap to freeze your plan.**" |
| 2 | Evening | "A budget in draft is like a parachute in the bag — useless until you pull the cord. **Freeze it now.**" |
| 3 | Morning | "Day 3 with an unfrozen budget. So close! **Tap freeze and start tracking.**" |
| 3 | Evening | "Your budget is literally one button away from being real. **Just. Tap. Freeze.**" |
| 4+ | Morning | "Day {X}. Your draft is gathering dust. **Freeze it and let it do its job.**" |
| 4+ | Evening | "We'll keep reminding you. You'll keep seeing this. **Freeze the budget.** It's right there." |

**With Transactions modifier (logging expenses but draft not frozen):**

| Time | Message |
|---|---|
| Morning | "You're logging expenses but your budget is still in draft. **Freeze it so we can track against the plan.**" |
| Evening | "₹{amount} spent against an unfrozen plan. It's like running a race with no finish line. **Tap freeze.**" |

---

### Escalation Summary

| Phase | Days | Tone | Freq | Clone CTA? | Transactions CTA? |
|---|---|---|---|---|---|
| Proactive | Last 3-5 of prev month | Encouraging, forward-looking | 2/day | ✅ Primary | N/A |
| Grace | 1-3 | Fresh start, light | 2/day | ✅ Primary | ❌ Too early |
| Nudge | 4-7 | Gentle push | 2/day | ✅ Primary | ✅ If applicable |
| Urgency | 8-15 | Direct, no-nonsense | 2/day | ✅ Desperate | ✅ With ₹ amounts |
| Intervention | 16-25 | Blunt, Duolingo-level | 2/day | ✅ Begging | ✅ With ₹ amounts |
| Month-End Pivot | 26-EOM | Forward-looking, retrospective | 2/day | ✅ Next month | ✅ Retrospective |
| Draft Not Frozen | Any | Warm, "almost there" | 2/day | N/A | ✅ If applicable |

### Notification Behavior

| Aspect | Behavior |
|---|---|
| **Tap action (default)** | Opens app → budget creation screen |
| **Tap action (Clone modifier)** | Opens app → clone flow (pre-populated from last month's budget) |
| **Tap action (Phase 6)** | Opens app → budget creation for NEXT month |
| **Tap action (Draft track)** | Opens app → existing draft with freeze button prominent |
| **Dynamic data** | ₹{amount} and {count} pulled from actual transaction data for the month |
| **Quiet hours** | No notifications before 8am or after 10pm |
| **Suppression** | Once budget is frozen, ALL budget creation reminders stop immediately |
| **Track priority** | If draft exists, Track B overrides Track A (never run both simultaneously) |

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
