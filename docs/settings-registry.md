# Settings Registry

Central registry of all configurable parameters in My2cents. This is the source of truth for what can be configured per household.

> **Implementation Status (Feb 2026):** The `household_settings` table defined below does **NOT yet exist** in the database. Currently, app-wide settings are hardcoded in `app/src/config/app.config.ts` (auth, invite, and display configs only). Per-household settings will be implemented when features that need them are built (notifications, savings buckets, etc.).

---

## Schema

```sql
household_settings (
  household_id UUID REFERENCES households(id),
  key TEXT NOT NULL,
  value JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (household_id, key)
)
```

---

## Guidelines

1. **When to add a setting:** If behavior could reasonably differ per household, make it configurable.
2. **Naming convention:** `snake_case`, grouped by feature area prefix (e.g., `notifications_`, `plan_`, `display_`).
3. **Always define a default:** Code must handle missing keys gracefully by falling back to the default.
4. **Update this registry first:** When adding a new setting, add it here before writing code.
5. **Keep it simple:** If a setting requires explanation beyond one sentence, reconsider whether it should be user-facing.

---

## P0 Parameters (Launch)

### Authentication & Invite Settings

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `auth_login_methods` | array of enum | `["phone_otp"]` | Enabled login methods. Options: `phone_otp`, `email_otp`, `google`. Multiple can be enabled. |
| `auth_default_country_code` | string | `+91` | Default country code for phone number input. |
| `invite_mode` | enum | `code_only` | How household invites work. `code_only` = human-readable code, `qr_enabled` = code + QR scanning (requires HTTPS). |

### Core Settings

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `savings_mode` | enum: A/B/C | `null` | How earmarked money is managed. A = physically move to separate account, B = track mentally in main account, C = no earmarking. Asked during onboarding. |
| `cc_bucket_linking_enabled` | boolean | `true` | Auto-generate pending fund transfers when CC expenses are logged against a linked bucket. |
| `plan_block_over_allocation` | boolean | `true` | If true, cannot freeze a plan where allocated > income. If false, shows warning but allows freeze. |

### Onboarding Settings

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `onboarding_voice_enabled` | boolean | `false` | Enable voice-based chat flow for category template setup (Option 2). Requires WhisperFlow. |
| `onboarding_voice_provider` | enum | `wispr` | Voice input provider. Options: `wispr` (Wispr Flow), `browser` (Web Speech API), `whisper` (OpenAI Whisper). |

### Threshold Settings

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `overspend_warning_threshold` | number (0-100) | `80` | Percentage of category budget at which to trigger a warning notification. |
| `overspend_critical_threshold` | number (0-100) | `100` | Percentage of category budget at which to trigger a critical overspend alert. |

### Notification Settings

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `notifications_enabled` | boolean | `true` | Master toggle for all notifications. If false, no notifications are sent. |
| `notifications_transaction_enabled` | boolean | `true` | Notify the other household member when a transaction is recorded. |
| `notifications_recording_reminder_enabled` | boolean | `true` | Send daily reminder to log any unrecorded transactions. |
| `notifications_daily_reminder_time` | time (HH:MM) | `21:00` | Time of day to send the daily recording reminder. |
| `notifications_overspend_enabled` | boolean | `true` | Send alerts when a category crosses warning or critical thresholds. |
| `notifications_monthly_setup_enabled` | boolean | `true` | Remind users to review and freeze the new month's plan on the 1st. |
| `notifications_bucket_reminder_enabled` | boolean | `true` | Remind users to complete bucket transfers after plan is frozen. |

### Display & Formatting Settings

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `display_currency_symbol` | string | `₹` | Currency symbol shown throughout the app. |
| `display_currency_code` | string | `INR` | ISO 4217 currency code for the household. |
| `display_country_code` | string | `+91` | Default country code for phone number input. |
| `display_date_format` | enum | `DD/MM/YYYY` | Date format used across the app. Options: `DD/MM/YYYY`, `MM/DD/YYYY`, `YYYY-MM-DD`. |
| `display_financial_year_start` | number (1-12) | `4` | Month number when the financial year starts. 4 = April (Indian fiscal year). |

---

## P1 Parameters (Post-Launch)

*To be added when P1 features are built.*

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `recurring_templates_enabled` | boolean | `true` | Enable recurring transaction templates that auto-generate at month start. |
| `reimbursement_tracking_enabled` | boolean | `true` | Allow tagging transactions as reimbursable and track reimbursement status. |
| `reconciliation_enabled` | boolean | `true` | Enable bank balance reconciliation feature. |
| `notifications_daily_summary_enabled` | boolean | `false` | Send end-of-day spending summary. |
| `notifications_weekly_digest_enabled` | boolean | `false` | Send weekly financial digest. |
| `notifications_bill_reminder_enabled` | boolean | `false` | Send reminders ahead of CC and bill due dates. |
| `user_default_payment_method` | uuid | `null` | Default account/CC for transaction entry. Per-user, not per-household. |

---

## P2+ Parameters (Future)

*To be added when features are built.*

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `split_transactions_enabled` | boolean | `false` | Allow splitting a single payment across multiple categories. |
| `receipt_attachment_enabled` | boolean | `false` | Allow attaching receipt photos to transactions. |
| `spending_by_person_enabled` | boolean | `true` | Show spending breakdown by household member. |
| `anomaly_detection_enabled` | boolean | `true` | Flag transactions or monthly totals that are statistical outliers. |
| `dashboard_green_threshold` | number | `70` | Budget utilization % below which category shows green. |
| `dashboard_amber_threshold` | number | `100` | Budget utilization % below which category shows amber (above green). |

---

## Adding a New Parameter

1. Identify the feature area prefix (`notifications_`, `plan_`, `display_`, etc.)
2. Choose a clear, descriptive key name in `snake_case`
3. Define the type, default value, and one-sentence description
4. Add to the appropriate section above (P0/P1/P2+)
5. Update code to read from `household_settings` with fallback to default
