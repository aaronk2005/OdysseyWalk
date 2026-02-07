# Odyssey Walk — Next Steps

Quick reference for what’s done and what to do next.

---

## QA fixes (React / hydration)

- **Tour complete:** `session` is now initialized with `useState(null)` and set in `useEffect(loadTour(), ...)` so server and client first paint match (avoids hydration errors).
- **MapView:** Map init runs only after a `mounted` flag is set in an effect, and `initMap` guards on `typeof window === "undefined"` so SSR never runs map code.
- **Unused import:** Removed `clearTour` from tour/complete page.

If you still see React errors, check the browser console for the exact message and component stack.

---

## ✅ Done (Maps, UI, Onboarding)

- **Maps:** Map first on `/create`, “tap to set start” hint, fit bounds after generate, follow mode on active tour, no-API-key fallback, map loading spinner + error with Retry.
- **UI:** OdysseyLogo in headers (create, active, complete, demo), empty states (create + complete), generate loading/error with Retry + “Use sample tour”, 44px tap targets, safe area on bottom sheet/CTAs, basic a11y (one h1, aria-labels).
- **Onboarding:** First-time welcome banner (Try demo / Create tour / Got it), stored in `localStorage` so it doesn’t show again; step labels on create; “Try the demo first” on home; one line before Start Walk (narration + mic); short intro on demo page.

---

## 1. Verify (you do this once)

- [ ] **No console errors:** Open http://localhost:3001, run: Home → Create → set location → Generate (or “Use sample tour”) → Start Walk → let one POI play → complete or back. Check browser console for errors.
- [ ] **Mark doc:** If all good, in `docs/PROMPT_next_steps_maps_ui_onboarding.md` section 5, check the last box: “No new console errors; existing flows still work.”

---

## 2. Optional polish (same codebase)

- **`/tours` page:** Add OdysseyLogo to header, 44px tap targets, and empty state CTA (“Create your first tour” → `/create`) so it matches the rest of the app.
- **Home:** If the welcome banner feels heavy, you can shorten the copy or make it a one-line “New? Try the demo first or create a tour” with two buttons only.
- **Create:** Optionally dim or disable the map + preferences panel while generating (already disabled button + spinner).

---

## 3. Larger roadmap (from team plan)

- **Saved tours list:** `/tours` already loads from `TourRepository` / `odyssey-saved-tours`; ensure “Save Tour” on complete actually persists and shows up here.
- **Backend:** Person 2 (STT/TTS), Person 3 (generate/QA). See `docs/next_steps_team_plan.md` for API contracts and deliverables.
- **Fallbacks:** Per team plan: fallback tour JSON if generate fails, placeholder audio if TTS fails, typed-question modal if STT unavailable (already in place).
- **Testing:** Manual pass of “Critical Demo Success Criteria” in the team plan (12 items) before a demo or judging.

---

## 4. Handoff to another agent

Use the same prompt as before:

> Read **docs/PROMPT_next_steps_maps_ui_onboarding.md** and implement the next steps in order: maps, then UI, then onboarding. Mark off the Definition of Done as you go.

For “continue building” focus, you can add:

> Then apply the same UI patterns to `/tours`: OdysseyLogo in header, 44px tap targets, and an empty state with “Create your first tour” linking to `/create`.
