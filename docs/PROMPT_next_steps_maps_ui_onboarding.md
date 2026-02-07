# Odyssey Walk — Next Steps: Maps, UI, and Onboarding

Use this prompt for the **next agent** to improve maps integration, UI polish, and onboarding. The core flows (create → generate → active tour → complete) are implemented; focus on making the experience clearer, more reliable, and welcoming for new users.

---

## 1. Relaunch Dev Server

Before making changes, ensure the dev server is running:

```bash
cd /home/aaron-kleiman/Downloads/OdysseyWalk
npm run dev
```

Open **http://localhost:3000** (or 3001 if 3000 is in use).

---

## 2. Maps Integration — Next Steps

**Current state:** Map loads on `/create` and `/tour/active`, click-to-pin works, Places autocomplete works, route polyline and POI markers render after generate. Light map theme. Green pin for start/user, blue/gray/purple for POIs.

**Improvements to implement:**

- **Map on create: position and prominence**
  - On `/create`, consider moving the map **above** the preferences panel (map first, then search + preferences below) so users see the map immediately and understand “pick a place here.”
  - Or add a short inline hint above the map: “Tap the map or search to set your start.”

- **Fit bounds after generate**
  - After a successful generate on `/create`, ensure the map **fits the full route** with comfortable padding (MapView has `fitBoundsTrigger`; wire it so one change after `setGenerated` triggers `fitBoundsTrigger` and the map refits to the route).

- **Active tour: follow mode and centering**
  - On `/tour/active`, when `followUser` is true (real or demo), keep the user marker centered or at least pan smoothly when location updates (already partially there; verify no jank and that the bottom sheet doesn’t obscure the user pin).

- **No map key: graceful fallback**
  - When `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` is missing, the create page shows MapsKeyBanner and a placeholder. Ensure “Use sample tour” and “Generate” (with default SF coords) still work so the app is testable without a key.

- **Optional: loading and error states for the map**
  - Show a subtle loading state (e.g. skeleton or spinner) in the map container until the map is ready.
  - If the Maps script fails to load, show a short message and a “Retry” or “Use without map” option.

---

## 3. UI Polish — Next Steps

**Current state:** Light theme, Odyssey logo on home, editorial “how it works” block, pill buttons, Preferences without icons. Create/tour/complete/demo use the same design tokens (e.g. `brand-primary`, `ink-*`, `surface`).

**Improvements to implement:**

- **Consistent logo usage**
  - Use the `OdysseyLogo` component in any shared header (e.g. tour/active, tour/complete, demo) so the app feels like one product. Keep “Back” or “Create Tour” as the primary action; logo can link to `/`.

- **Empty states**
  - **Create:** If the user hasn’t selected a location, consider a soft prompt: “Search or tap the map to set your starting point” (could be in the search placeholder or a one-line hint that hides once a place is set).
  - **Tour complete:** If `session` is null (e.g. user landed here without finishing a tour), show a friendly message and a clear CTA: “No tour data. Start a new tour” with a button to `/create`.

- **Loading and errors**
  - **Generate:** While generating, disable the “Generate My Tour” button and show a spinner; optionally dim or disable the map and preferences so it’s clear something is in progress.
  - **Error:** Keep the existing error block with “Retry” and “Use sample tour”; ensure it’s visible and readable (contrast, spacing).

- **Mobile: tap targets and safe area**
  - All primary actions (Create Tour, Start Walk, Generate, My location) should have min ~44px height. Use `safe-bottom` (or equivalent) for the bottom sheet and any fixed bottom CTAs so they’re not hidden by the device notch/home indicator.

- **Accessibility**
  - Ensure headers use a logical order (e.g. one h1 per page). Buttons and links should have clear `aria-label` where the visible text isn’t enough (e.g. “Back”, “My location”, “Play”, “Hold to ask”).

---

## 4. Onboarding — Make It Better

**Goal:** New users quickly understand what the app does and how to get value (create a tour → start walk → hear narration → ask questions). Reduce confusion on first visit.

**Implement the following:**

- **First-time landing (home page)**
  - **Option A — Short intro line:** Add one line under the hero, e.g. “Create a walking tour from any location. Hear stories at each stop and ask questions with your voice.” (Only show if we don’t want to rely on the editorial list alone.)
  - **Option B — First-time modal or banner:** On first visit (e.g. detect via `localStorage` key like `odyssey-onboarding-seen`), show a dismissible modal or top banner: “Welcome! Pick a spot on the map, choose a theme, and we’ll generate a walking tour. You can try the demo first if you prefer.” With actions: “Try demo” (→ `/demo`) and “Create tour” (→ `/create`) and “Got it” (dismiss and set flag). Do not show again once dismissed.

- **Create page: step clarity**
  - Treat the create page as a short flow: (1) Set location, (2) Set preferences, (3) Generate, (4) Start walk.
  - Optional: add a minimal progress indicator (e.g. “Step 1 of 3: Set your start” → “Step 2: Preferences” → “Step 3: Generate”) or subtle labels above each section so first-time users know the order.

- **Before first “Start Walk” (tour/active)**
  - When `!introPlayed`, the panel already says “Your tour is ready. Start to hear the intro and begin navigation.” Optionally add one line: “You’ll hear narration at each stop. Hold the mic button to ask questions.”

- **Demo as onboarding**
  - On the home page, add a secondary link/button: “Try the demo first” (or “See how it works”) that goes to `/demo`. Make it visible but not competing with the primary “Create Tour” CTA. The demo page can briefly say “This runs a short scripted tour so you can see how narration and Q&A work.”

- **Persistence of onboarding**
  - Use `localStorage` (e.g. `odyssey-onboarding-seen`) to mark that the user has dismissed the welcome message or completed the demo, so we don’t repeat the same message every time.

---

## 5. Definition of Done for This Work

- [x] Map is above the fold on create (or has a clear “tap to set start” hint); fit bounds after generate works.
- [x] Map loading/error states are handled; no map key still allows sample tour and generate with default location.
- [x] Logo appears in shared headers where it makes sense; empty states and error states are clear and actionable.
- [x] First-time users see a short welcome (modal or banner) with “Try demo” and “Create tour”; it can be dismissed and doesn’t show again once the flag is set.
- [x] Create page flow is clear (optional step labels or one-line hints); “Start Walk” panel has a one-line explanation of narration + mic.
- [x] “Try the demo first” (or equivalent) is visible on the home page and links to `/demo`.
- [x] All primary actions are touch-friendly; bottom sheet and fixed CTAs respect safe area.
- [ ] No new console errors; existing flows (create → generate → start walk → POI triggers → Q&A → complete) still work.

---

## 6. Files to Touch (Reference)

- **Maps:** `app/create/page.tsx`, `components/MapView.tsx`, `app/tour/active/page.tsx`
- **UI / logo / empty states:** `app/page.tsx`, `app/create/page.tsx`, `app/tour/complete/page.tsx`, `components/OdysseyLogo.tsx`, `components/CompletionSummary.tsx`
- **Onboarding:** `app/page.tsx` (first-time banner/modal), `app/create/page.tsx` (optional step hints), `app/tour/active/page.tsx` (pre–Start Walk copy), `app/demo/page.tsx` (short intro line)
- **Shared:** `app/layout.tsx` only if you need a global onboarding wrapper; otherwise keep onboarding per-page.

---

## 7. What Not to Change

- Do **not** change backend API contracts or add new API routes unless the team plan says so.
- Do **not** remove or break: generate flow, SessionStore save/load, useActiveTour hook, BottomSheetPlayer, AskTextModal, or demo mode.
- Do **not** change the design token names (e.g. `brand-primary`, `ink-primary`) without updating all usages; prefer adding new utilities or components.

---

Use this document as the **primary prompt for the next agent**. The agent should read it first, then implement the sections in order (maps → UI → onboarding), and tick off the Definition of Done items as they go.
