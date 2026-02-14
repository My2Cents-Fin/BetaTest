# My2cents — Design System

> The definitive design reference for building My2cents.
> **Last updated:** 2026-02-10

---

## Brand

**Name:** My2cents
**Tagline:** Money, together
**Positioning:** A warm, sophisticated budgeting app for couples building their financial future.

### Logo

**Wordmark:** `My2cents`
- "My" — Poppins 400 (Regular)
- "2cents" — Poppins 600 (SemiBold)

**Mark:** `[ 2. ]`
- "2" — Poppins 600, white on purple background
- Dot — amber/gold, positioned bottom-right

---

## Implementation Stack

**CSS Framework:** Tailwind CSS v4
**Approach:** Utility-first with standard Tailwind colors
**Font:** Poppins (Google Fonts)

```html
<!-- Font import in index.html -->
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet">
```

---

## Color Palette (Tailwind Classes)

### Primary Brand

| Purpose | Tailwind Class | Hex | Usage |
|---------|----------------|-----|-------|
| Primary | `purple-800` | #6b21a8 | Primary buttons, active states, FAB, headers |
| Primary Hover | `purple-900` | #581c87 | Button hover states |
| Primary Medium | `purple-600` | #9333ea | Secondary accents |
| Primary Soft | `purple-100` | #f3e8ff | Selected items, soft highlights |
| Primary Muted | `purple-50` | #faf5ff | Subtle backgrounds |

### Backgrounds

| Purpose | Tailwind Class | Hex | Usage |
|---------|----------------|-----|-------|
| Page Background | `stone-50` | #fafaf9 | Main app background |
| Card Surface | `white` | #ffffff | Cards, modals, bottom sheets |
| Section Background | `gray-50` | #f9fafb | Dropdown headers, subtle sections |

### Text

| Purpose | Tailwind Class | Hex | Usage |
|---------|----------------|-----|-------|
| Primary Text | `gray-900` | #111827 | Headings, important text |
| Secondary Text | `gray-700` | #374151 | Body text |
| Tertiary Text | `gray-500` | #6b7280 | Labels, metadata |
| Muted Text | `gray-400` | #9ca3af | Placeholders, hints |

### Status Colors

| State | Tailwind Class | Hex | Usage |
|-------|----------------|-----|-------|
| Success | `green-600` | #16a34a | Income, positive values, on track |
| Success Light | `green-500` | #22c55e | Income indicators |
| Success Soft | `green-50` | #f0fdf4 | Income card backgrounds |
| Warning | `yellow-500` | #eab308 | Near budget limit (80-100%) |
| Danger | `red-600` | #dc2626 | Expenses, over budget |
| Danger Light | `red-500` | #ef4444 | Expense indicators |
| Danger Soft | `red-50` | #fef2f2 | Expense card backgrounds |

### Borders

| Purpose | Tailwind Class | Hex | Usage |
|---------|----------------|-----|-------|
| Default Border | `gray-200` | #e5e7eb | Input borders, card borders |
| Light Border | `gray-100` | #f3f4f6 | Subtle dividers, card borders |
| Divider | `gray-50` | #f9fafb | List item dividers |

---

## Typography

**Font Family:** Poppins

```css
font-family: 'Poppins', sans-serif;
```

### Type Scale (Tailwind Classes)

| Style | Class | Size | Weight | Usage |
|-------|-------|------|--------|-------|
| Display | `text-3xl md:text-4xl font-semibold` | 30px/36px | 600 | Large amounts (₹) |
| Page Title | `text-xl font-semibold` | 20px | 600 | Screen titles |
| Section Title | `text-lg font-semibold` | 18px | 600 | Card titles, month display |
| Card Title | `text-base font-bold` | 16px | 700 | Summary amounts |
| Body | `text-sm font-medium` | 14px | 500 | Transaction names, labels |
| Small | `text-xs font-medium` | 12px | 500 | Metadata, dates |
| Tiny | `text-[11px]` | 11px | 400 | Secondary info |
| Micro | `text-[10px]` | 10px | 400 | Filter labels, badges |

### Text Colors by Context

```
Headings:       text-gray-900
Body:           text-gray-700
Secondary:      text-gray-500
Muted:          text-gray-400
Income:         text-green-600
Expense:        text-red-600
Primary action: text-purple-600
```

---

## Spacing

Using Tailwind's default spacing scale (4px base).

### Common Patterns

| Context | Classes | Actual Size |
|---------|---------|-------------|
| Page padding | `p-4` | 16px |
| Card padding | `p-4` or `p-5` | 16px or 20px |
| Card gap | `space-y-4` | 16px |
| Input padding | `px-3 py-2.5` | 12px × 10px |
| Button padding | `px-4 py-2` | 16px × 8px |
| List item | `p-3` | 12px |
| Icon gap | `gap-2` or `gap-3` | 8px or 12px |

### Bottom Padding (for fixed bottom nav)

```
Mobile: pb-24 (96px) — accounts for bottom nav + FAB
Desktop: pb-8 (32px) — just some breathing room
```

---

## Border Radius

| Token | Class | Size | Usage |
|-------|-------|------|-------|
| Small | `rounded-lg` | 8px | Inputs, small buttons, pills |
| Medium | `rounded-xl` | 12px | Cards, modals |
| Large | `rounded-2xl` | 16px | Hero cards |
| Sheet | `rounded-t-3xl` | 24px | Bottom sheets (mobile) |
| Full | `rounded-full` | 50% | FAB, avatar circles, pills |

---

## Shadows

| Token | Class | Usage |
|-------|-------|-------|
| Subtle | `shadow-sm` | Cards, list items |
| Medium | `shadow-lg` | FAB, elevated buttons |
| Strong | `shadow-xl` | Dropdowns, modals |

---

## Components

### Buttons

**Primary Button (Filled)**
```html
<button class="px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 active:bg-purple-800 transition-colors">
  Button Text
</button>
```

**Disabled Button**
```html
<button class="px-4 py-2 bg-gray-200 text-gray-400 text-sm font-medium rounded-lg cursor-not-allowed" disabled>
  Disabled
</button>
```

**Ghost Button**
```html
<button class="px-4 py-2 text-purple-600 text-sm font-medium hover:bg-purple-50 rounded-lg transition-colors">
  Ghost Button
</button>
```

**Filter Toggle Button (Active)**
```html
<button class="px-3 py-1.5 text-xs font-medium rounded-full bg-purple-600 text-white">
  Active
</button>
```

**Filter Toggle Button (Inactive)**
```html
<button class="px-3 py-1.5 text-xs font-medium rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200">
  Inactive
</button>
```

### FAB (Floating Action Button)

**Mobile Center FAB**
```html
<button class="w-14 h-14 bg-purple-600 rounded-full shadow-lg flex items-center justify-center text-white active:bg-purple-700 transition-colors border-4 border-white">
  <svg class="w-7 h-7"><!-- Plus icon --></svg>
</button>
```

**Desktop FAB with Tooltip**
```html
<div class="fixed bottom-8 right-4 z-30 group">
  <button class="w-14 h-14 bg-purple-600 text-white rounded-full shadow-lg hover:bg-purple-700 flex items-center justify-center">
    <svg class="w-7 h-7"><!-- Plus icon --></svg>
  </button>
  <div class="absolute bottom-full right-0 mb-2 px-3 py-1.5 bg-gray-800 text-white text-xs font-medium rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
    Tooltip Text
  </div>
</div>
```

### Inputs

**Default Input**
```html
<input class="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-900 bg-white focus:outline-none focus:border-purple-400" />
```

**Input with Label**
```html
<div>
  <label class="text-xs text-gray-500 mb-1.5 flex items-center gap-1">
    <span>📅</span> Label Text
  </label>
  <input class="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm" />
</div>
```

### Cards

**Basic Card**
```html
<div class="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
  <!-- Content -->
</div>
```

**Summary Card**
```html
<div class="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
  <div class="grid grid-cols-2 gap-4 text-center">
    <div class="flex items-center justify-center gap-2">
      <span class="text-green-500">↑</span>
      <div>
        <p class="text-[10px] text-gray-500 uppercase tracking-wide">Label</p>
        <p class="text-base font-bold text-green-600">₹45,000</p>
      </div>
    </div>
  </div>
</div>
```

### Transaction Item

```html
<div class="flex items-center gap-3 p-3 cursor-pointer hover:bg-gray-50 transition-colors">
  <!-- Icon with colored background -->
  <div class="w-9 h-9 rounded-full flex items-center justify-center bg-red-50">
    <span class="text-base">🛒</span>
  </div>

  <!-- Details -->
  <div class="flex-1 min-w-0">
    <p class="text-sm font-medium text-gray-900 truncate">Category Name</p>
    <p class="text-[11px] text-gray-400">10 Feb • Recorder Name</p>
  </div>

  <!-- Amount -->
  <p class="text-sm font-semibold text-red-600">-₹850</p>
</div>
```

### Bottom Sheet Modal (Mobile)

```html
<div class="fixed inset-0 z-50 flex items-end md:items-center justify-center">
  <!-- Backdrop -->
  <div class="absolute inset-0 bg-black/40"></div>

  <!-- Sheet -->
  <div class="relative w-full md:w-[420px] bg-white rounded-t-3xl md:rounded-2xl max-h-[85vh] overflow-hidden">
    <!-- Header -->
    <div class="flex items-center justify-between px-4 py-3 border-b border-gray-100">
      <h2 class="text-base font-semibold text-gray-900">Title</h2>
      <button class="text-gray-400 hover:text-gray-600">✕</button>
    </div>

    <!-- Content -->
    <div class="px-4 pb-4">...</div>
  </div>
</div>
```

### Dropdown

```html
<div class="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden">
  <div class="p-4 space-y-4">
    <!-- Header -->
    <div class="flex items-center justify-between pb-2 border-b border-gray-100">
      <span class="text-sm font-semibold text-gray-900">Dropdown Title</span>
      <button class="text-gray-400 hover:text-gray-600">✕</button>
    </div>

    <!-- Content -->
    <div>...</div>
  </div>
</div>
```

### Progress Bar

```html
<div class="h-2 bg-gray-100 rounded-full overflow-hidden">
  <div class="h-full bg-purple-600 transition-all duration-300" style="width: 45%"></div>
</div>

<!-- Color variants based on percentage -->
<!-- < 80%:  bg-purple-600 -->
<!-- 80-100%: bg-yellow-500 -->
<!-- > 100%: bg-red-500 -->
```

---

## Navigation

### Mobile Bottom Nav

```html
<nav class="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 h-16 z-40">
  <!-- Center FAB (absolute positioned above nav) -->
  <div class="absolute left-1/2 -translate-x-1/2 -top-6">
    <button class="w-14 h-14 bg-purple-600 rounded-full shadow-lg border-4 border-white">
      +
    </button>
  </div>

  <div class="flex h-full items-center px-4">
    <!-- Nav items: Home, Budget, [spacer], Transactions, Profile -->
  </div>
</nav>
```

### Nav Item States

```html
<!-- Active -->
<button class="flex-1 flex flex-col items-center justify-center gap-0.5 text-purple-600">
  <span class="text-xl">🏠</span>
  <span class="text-xs font-medium">Home</span>
</button>

<!-- Inactive -->
<button class="flex-1 flex flex-col items-center justify-center gap-0.5 text-gray-400 active:text-gray-600">
  <span class="text-xl">💰</span>
  <span class="text-xs font-medium">Budget</span>
</button>
```

---

## Icons

### Approach

Using **emoji icons** for simplicity and cross-platform consistency.

### Navigation Icons

| Purpose | Emoji |
|---------|-------|
| Home/Dashboard | 🏠 |
| Budget | 💰 |
| Transactions | 📋 |
| Profile/Settings | 👤 |
| Add | + (SVG) |

### Category Icons (Examples)

| Category | Emoji |
|----------|-------|
| Salary | 💼 |
| Groceries | 🛒 |
| Food Ordering | 🍕 |
| Rent | 🏠 |
| Electricity | ⚡ |
| Fuel | ⛽ |
| Default | 📦 |

### UI Icons (SVG)

For functional icons, use inline SVG with Heroicons style:

```html
<!-- Plus -->
<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
</svg>

<!-- Close (X) -->
<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
</svg>

<!-- Filter -->
<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
  <path stroke-linecap="round" stroke-linejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
</svg>

<!-- Delete (Trash) -->
<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
</svg>

<!-- Chevron Down -->
<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
</svg>
```

---

## Responsive Breakpoints

Using Tailwind's default breakpoints:

| Name | Prefix | Width | Usage |
|------|--------|-------|-------|
| Mobile | (default) | < 768px | Phone portrait |
| Tablet/Desktop | `md:` | ≥ 768px | Tablet, desktop |

### Common Responsive Patterns

```html
<!-- Hide on mobile, show on desktop -->
<div class="hidden md:block">Desktop only</div>

<!-- Show on mobile, hide on desktop -->
<div class="md:hidden">Mobile only</div>

<!-- Bottom sheet on mobile, centered modal on desktop -->
<div class="w-full md:w-[420px] rounded-t-3xl md:rounded-2xl">
```

---

## Animation

### Transitions

```css
transition-colors    /* Color changes (hover, active) */
transition-opacity   /* Fade in/out */
transition-transform /* Scale, translate */
transition-all       /* All properties */
```

### Timing

Default Tailwind: `duration-150` (150ms)

For smoother animations: `duration-300`

### Common Patterns

```html
<!-- Button hover -->
<button class="hover:bg-purple-700 transition-colors">

<!-- Dropdown fade -->
<div class="opacity-0 group-hover:opacity-100 transition-opacity">

<!-- Rotate chevron -->
<svg class="transition-transform rotate-180">
```

---

## Accessibility

### Focus States

All interactive elements should have visible focus:

```html
<input class="focus:outline-none focus:border-purple-400" />
<button class="focus:outline-none focus:ring-2 focus:ring-purple-400" />
```

### Touch Targets

Minimum touch target: 44×44px for mobile

```html
<!-- Button with adequate touch target -->
<button class="w-9 h-9 ...">  <!-- 36px, close to minimum -->
<button class="w-14 h-14 ..."> <!-- 56px, comfortable -->
```

### Color Contrast

- Text on white: Use `gray-900` or `gray-700` (passes WCAG AA)
- Text on purple: Use `white` (passes WCAG AA)
- Status colors on white: `green-600`, `red-600` (passes WCAG AA)

---

## File Structure

```
app/src/
├── index.css                    # Tailwind imports
├── app/
│   └── AppLayout.tsx           # Main layout with nav
├── modules/
│   ├── navigation/components/
│   │   ├── BottomNav.tsx       # Mobile bottom nav
│   │   └── SideNav.tsx         # Desktop sidebar
│   ├── dashboard/components/
│   │   ├── DashboardTab.tsx    # Dashboard view
│   │   └── QuickAddTransaction.tsx  # Add/edit modal
│   ├── budget/components/
│   │   └── BudgetTab.tsx       # Budget view
│   └── transactions/components/
│       └── TransactionsTab.tsx # Transactions list
└── shared/components/
    ├── Button.tsx
    ├── Input.tsx
    ├── Card.tsx
    └── ...
```

---

## Quick Reference

### Most Used Classes

```
Background:     bg-white, bg-stone-50, bg-gray-50
Text:           text-gray-900, text-gray-500, text-gray-400
Primary:        bg-purple-600, text-purple-600, border-purple-400
Success:        bg-green-50, text-green-600
Danger:         bg-red-50, text-red-600
Border:         border-gray-200, border-gray-100
Radius:         rounded-lg, rounded-xl, rounded-full
Shadow:         shadow-sm, shadow-lg, shadow-xl
Spacing:        p-3, p-4, gap-2, gap-3, space-y-4
Font:           text-xs, text-sm, text-base, font-medium, font-semibold
```

---

*This is the source of truth for My2cents design. Update this document when design decisions change.*
