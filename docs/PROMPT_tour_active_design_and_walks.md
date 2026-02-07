# Odyssey Walk — Tour Active Design & Walks Page

Use this prompt for the **next agent** to improve the active-tour experience and the walks list. The user is past the create-tour and preferences flow; focus on making the **actual walk** feel better and on the **saved + premade walks** page.

---

## Instructions for the next agent

**Implement in this order:**

1. **Tours/walks page refinements** (if needed) — Header “Walks”, saved walks from `odyssey-saved-tours`, popular walks from `/api/tours`, clear empty states and a single CTA when both sections are empty.
2. **Tour-active layout** — Smaller map, better header (rethink centered “History Walk”), cooler bottom sheet and walk experience.
3. **Ask modal redesign** — Redesign or simplify the “type your question” modal; keep typing questions. User really doesn’t like the current one.
4. **Demo/settings simplification** — Simplify or remove later (e.g. one “Demo mode” toggle); keep behavior.

**What not to change:** Do not remove or break core flows: SessionStore, useActiveTour, BottomSheetPlayer, AskTextModal (redesign only), demo mode behavior, or create → active → complete navigation.

---

## 1. Context

- **Create tour** and **preferences** are done.
- **Tour active** page (`/tour/active`) is functional but the design and layout need work.
- User wants a **page with saved walks and premade walks in popular areas** before or alongside the tour redesign.

---

## 2. Tour Active Page — Design Changes

**File:** `app/tour/active/page.tsx`, `components/MapView.tsx`, `components/BottomSheetPlayer.tsx`, `components/AskTextModal.tsx`, `components/SettingsDrawer.tsx`

### Map

- **Make the map smaller.** The map container is currently full-width and tall (e.g. 962×526px). Reduce its height or use a constrained layout (e.g. map in a card, or map taking only top 40–50% of the screen) so the walk UI (bottom sheet, controls) feels more balanced and the map doesn’t dominate.

### Header

- **Revisit header placement.** The current header has Back, logo, and a centered **h1** (“history Walk” / “[theme] Walk”). User doesn’t like this placement. Consider: left-aligned title, smaller title, or moving the tour name into the bottom sheet instead of the header so the header is minimal (e.g. Back + logo only, or Back + compact title).

### Bottom sheet & player

- **Bottom sheet:** Clearer layout and hierarchy; keep behavior. Expand/collapse strip, “Select a stop or walk to start”, tour name (“history Walk”), “Next: Ferry Building”, “0 / 6 stops”, **Play**, **Hold to ask** mic button. Refine so it feels “cooler” and more focused during the walk.
- **Start Walk** panel (before intro plays): Ensure it’s clear and fits the new layout.

### Demo mode & settings

- **Simplify or remove later.** The **Settings drawer** (aside) includes “Demo mode Off”, “Simulate location along the route”, etc. User said “get rid of some of this stuff later.” Prefer: keep demo mode working for testing, but simplify the UI (e.g. move to a single “Demo mode” toggle, or hide advanced options behind “More options”). Don’t remove core behavior (SessionStore, useActiveTour, demo mode logic).

### Ask / type question modal

- **Redesign or simplify the Ask modal.** User really doesn’t like the current one (e.g. “Ask a question”, “Voice didn’t work? Type your question below.”, text input, Cancel/Submit). Prefer: minimal inline input or a cleaner modal with less copy and clearer primary action. **Keep** the ability to type a question when voice isn’t used.

### Overall

- **“When you’re doing the actual walk it should be cooler.”** The active-tour screen should feel more immersive and intentional: smaller map, better header, cleaner bottom sheet and ask flow, and (per above) less clutter from demo/settings and the ask modal.

---

## 3. Saved & Premade Walks Page (Priority)

**File:** `app/tours/page.tsx` (and optionally `app/api/tours/route.ts`, `public/tours/*.json`)

- **One page with two concepts:**
  - **Your saved walks** — From `localStorage` key `odyssey-saved-tours`. List each with name (e.g. “History Walk”), duration, stop count, and a “Start again” button that restores that session (via SessionStore) and navigates to `/tour/active`.
  - **Popular walks** — Use existing `/api/tours` (e.g. `sample.json`, `spooky.json`) and the same TourCard grid. Copy: “Premade walks in popular areas.”
- **Empty states:** Separate messages when there are no saved walks vs no popular tours. When **both** sections are empty, show a single CTA at the bottom (e.g. “Create your first tour” / “Try the demo”) instead of duplicating CTAs in each section.
- **Header:** Page title is “Walks” (not “Tours”).

---

## 4. What Not to Change

- Do **not** remove or break: generate flow, SessionStore, useActiveTour, BottomSheetPlayer, AskTextModal (redesign only), demo mode behavior, or core navigation (create → active → complete).
- Do **not** change API contracts for `/api/tour/generate` or `/api/qa` unless the team plan says so.
- Keep design tokens (e.g. `brand-primary`, `ink-primary`) unless you update all usages.

---

## 5. Definition of Done (checklist for next agent)

- [ ] Map on `/tour/active` is smaller or constrained; header placement improved.
- [ ] Bottom sheet and “Start Walk” panel feel clearer and more focused.
- [ ] Ask (type question) modal is redesigned or simplified; user doesn’t “really dislike” it.
- [ ] Demo/settings UI is simplified (e.g. one toggle or less clutter); behavior intact.
- [ ] Tours page shows both “Saved walks” and “Premade / popular walks” clearly.
- [ ] No regressions: create → generate → start walk → POI triggers → Q&A → complete still works.

Use this document as the **primary prompt for the next agent** for tour-active design and the walks page.
