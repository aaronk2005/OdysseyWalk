# Odyssey Walk — Product Redesign & UX Spec

**Role:** Principal Product Design Engineer  
**Scope:** UI/UX and feature evolution. No backend/API changes.  
**Goal:** Make Odyssey Walk feel like a real, polished product — audio-first, walking-mode, mobile-first.

---

## 1. PRODUCT CRITIQUE

### What works well
- **Core loop exists:** Create → Start → Walk → Ask → Finish is implemented. Tour generation, session store, geo triggers, TTS/STT, and completion flow all function.
- **Pre-walk briefing** is a clear moment: map + bottom sheet + single “Start Walk” CTA. The 60/40 split and slide-up sheet feel intentional.
- **Voice bar** has distinct states (idle / listening / thinking / speaking) and color changes; hold-to-talk is wired.
- **Map** already has navigation-mode styling (teal route, active vs visited POI differentiation) and optional follow-user.
- **Completion page** has confetti, stats, and clear CTAs (Create another, Replay, Share). Emotional payoff is attempted.
- **Design system** is consistent: teal brand, surface/ink tokens, safe areas, min touch targets (44px).

### Where it feels unfinished or generic
- **Landing** reads like a generic “Discover Walking Tours” template. The hero copy could be the tagline of any tour-aggregator; it doesn’t say “Walk. Listen. Ask.” or promise an audio-first, in-pocket experience.
- **Create flow** is form-first: “Step 1 / Step 2” and a big preferences panel. The map is secondary. There’s no sense of “pick a place and go” — it feels like configuring a product, not starting a walk.
- **Active walk** is the main offender: the map gets ~45vh, then a card (audio panel), then the voice bar. The layout is correct in principle but the **hierarchy is wrong**. The eye goes to the map first; audio feels like a widget below it. The mic is 64px and shares the row with “Voice Next”; it doesn’t dominate. There’s no single “hero” moment that says “the story is playing; you can ask anything.”
- **Audio panel** shows stop name, “Stop X of Y,” a **stop-level progress bar** (good), and Replay / Play-Pause / Skip. It’s functional but looks like a generic media card. Play/Pause is not the undisputed primary action; Replay and Skip compete visually. There’s no “now playing” emphasis (e.g. “Listening to intro” or “At Stop 2 — [name]”).
- **Empty space:** Between the map and the audio card there’s padding; between the audio card and the voice bar the layout uses `flex-1 min-h-0` and `justify-end`, which on tall viewports leaves a large **gap**. That gap has no content — no “Next stop in 120m,” no “You’re halfway,” no status line. Same on pre-walk: the sheet has one line of intro copy and a button; the rest is padding. On complete, the main block has stats and CTAs but the top (header + map) and bottom (Save tour) feel disconnected from the middle.

### Why later pages feel weak
- **Momentum drops after “Start Walk.”** The transition from pre-walk to active walk is a single fade-in. There’s no “intro is playing” moment — the map just appears and the audio panel shows “Intro” with a progress bar. The user isn’t guided to “put your phone in your pocket and listen.”
- **During the walk**, the next-stop badge (“Next: [name] · 320m”) is good but sits at the bottom of the map. The **primary content** (what’s playing, what to do next) is split across the audio card and the mic label. No one line answers “What’s happening now?”
- **Completion** is polite but generic (“Nice walk.”). The confetti and stats are good; the copy doesn’t reinforce the product (“You walked, you listened, you asked”) or create a clear “done” ritual.

### Where users lose emotional momentum
1. **After tapping “Start Walk”** — the screen changes but there’s no “the tour has begun” moment. Intro plays; the UI doesn’t celebrate or focus attention on listening.
2. **In the middle of the walk** — the big empty band between audio and mic. No progress narrative (“Stop 3 of 7”), no anticipation (“Next: Museum in ~2 min”), no sense of “you’re in the flow.”
3. **After asking a question** — the “Resume” hint exists but the transition from “Speaking…” back to “Hold to ask” is abrupt. No “Narration paused; tap to resume” clarity.
4. **On completion** — “Nice walk” is forgettable. The opportunity to summarize (“You asked 2 questions,” “7 stops, 32 min”) or invite “Create another” with energy is underused.

### Why the UI doesn’t feel “audio-first”
- **Visual hierarchy:** The map is the largest element. In an audio-first product, the **current sound** (intro / stop name / answer) and the **primary action** (Play/Pause, Ask) should dominate. Here, the map dominates; audio is a card; mic is one of two buttons.
- **No “now playing” spine:** There’s no persistent, glanceable line that always answers “What am I hearing?” (e.g. “Intro” / “Stop 2: Central Square” / “Answering your question”). The audio panel has the stop name but it’s inside a card that competes with the map.
- **Voice is not the hero:** The mic is the same visual weight as the “say next” button. The main CTA during a walk should be “Ask” (hold mic). It should be larger, central, and the only thing in its row on small screens.
- **Glanceability:** For phone-in-pocket use, the ideal is: one glance shows “Stop 3 of 7” + “Playing” or “Paused” + one big “Ask” target. The current layout requires parsing map + card + two buttons.

---

## 2. PRODUCT DIRECTION (COMMIT)

Reframe Odyssey Walk as:

- **AUDIO-FIRST** — Audio is the product; the map supports it. Every screen should reinforce “you are here to listen (and ask).”
- **WALKING MODE** — Designed for phone-in-pocket. UI is glanceable; primary actions are large and few; status is one line when possible.
- **SINGLE PRIMARY LOOP** — Create → Start → Walk → Ask → Finish. No side loops during the walk (e.g. no “browse other tours” from active walk).
- **MOBILE-FIRST EVEN ON DESKTOP** — Layouts, touch targets, and hierarchy are optimized for a narrow viewport; desktop gets the same structure, not a different “dashboard.”

All changes below reinforce this. No feature should contradict “audio-first, walking-mode, one loop.”

---

## 3. REDESIGN THE ACTIVE WALK EXPERIENCE (TOP PRIORITY)

This screen is the heart of the product. Changes here have the highest impact.

### A. Map behavior

- **Treat the map as navigation mode, not exploration.** It answers “Where am I? Where’s the next stop?” only.
- **Auto-follow user location** when in real mode (already conditional). In demo mode, keep follow. No toggle in the main UI during walk; if a “follow camera” toggle exists, hide it from the walk screen or put it in Settings only.
- **Highlight only:**  
  - **Current stop** — already the “active” POI (e.g. teal, larger).  
  - **Next stop** — same as “upcoming” (teal, medium).  
  - **Completed stops** — subtle (e.g. smaller, muted fill). Already partially there; ensure no clutter (no labels on markers unless expanded).
- **Reduce map controls** unless explicitly expanded: no zoom/compass in default view, or minimal (e.g. single “recenter” FAB). If the map library shows default UI, hide or collapse it so the map is calm.

### B. Audio player redesign (persistent control surface)

Replace the current card with a **persistent audio control surface** that feels like “now playing,” not a generic widget.

- **Show:**
  - **Current stop name** (or “Intro” / “Outro”) — one line, prominent.
  - **Stop number** — e.g. “3 of 7” (already present; keep it).
  - **Playback progress** — keep the **stop-level** progress bar (stops completed). If backend ever exposes phrase-level currentTime/duration, add a thin “within-current-stop” progress bar; for now, stop-level is enough.
- **Make Play / Pause the primary visual action:** One large, central button (e.g. 56px). Replay and Skip are secondary (smaller, or icon-only below the main button). On mobile, avoid a full desktop-style control strip (no need for 5 equal buttons).
- **Avoid desktop-style controls:** No timeline scrubber, no volume slider in the main surface. Keep it: [Replay] [Play/Pause] [Skip] and the one progress bar.

**Layout (conceptual):**  
- Line 1: “[Stop name]” + optional “Answering…” or “Intro” badge.  
- Line 2: “Stop 3 of 7” + optional “· Answering…”  
- Progress bar (stops).  
- Row: Replay (icon) — **Play/Pause (large)** — Skip (icon).

### C. Voice interaction redesign (mic as star)

The mic must feel like the **star feature**: always visible, large, tactile, central.

- **Layout:**  
  - On active-walk screen, the **mic is the only primary control in its row** (or the dominant one). “Voice Next” can be a smaller secondary (e.g. text link “Say ‘next’” or small icon) so the **main circle is the Ask mic.**  
  - Mic **centered**; sufficient padding so it’s the obvious target.  
  - Optional: subtle “Hold to ask” line directly under the mic (no competing “Say next” in the same line).
- **Size / affordance:**  
  - **Minimum 72px** touch target (prefer 80px).  
  - Clear **press-and-hold** affordance: slight shadow, or a soft ring that suggests “hold.”  
  - Visually one button; no dual-purpose (e.g. tap vs hold) unless clearly labeled.
- **States (distinct):**  
  - **Idle** — default (e.g. teal gradient). Label: “Hold to ask about this place.”  
  - **Listening** — active (e.g. pulse/ring animation, same or slightly different color). Label: “Listening…”  
  - **Thinking** — e.g. amber, subtle spinner or static “Thinking…”  
  - **Speaking** — e.g. green, “Speaking…”  
  Transitions between these should be immediate (no long delay) so the user knows the system heard them and is responding.
- **Visual feedback:**  
  - On press: scale down slightly (e.g. 0.95).  
  - While listening: gentle pulse or ring (already present; keep it).  
  - When transitioning to thinking/speaking: color change + label change.
- **Automatic pause/resume of narration:**  
  - When user starts Ask (listening): **pause** current narration.  
  - When answer ends: **resume** (or show “Resume” and let user tap Play).  
  Current behavior (resume hint) is good; make the “Resume” action obvious (e.g. on the main Play/Pause button).

**Summary:** One big mic, centered; clear states; “Hold to ask” copy; Voice Next de-emphasized; narration pauses on Ask and resumes (or one-tap Resume) after answer.

---

## 4. FIX THE EMPTY SPACE PROBLEM

### Where it happens and why it feels bad

- **Active walk (after intro):** The flex column gives the map ~45vh, then the audio panel, then `flex-1` for the voice section. On tall phones or desktop, the space between the audio panel and the mic is **large and empty**. It feels like a bug or unfinished layout; it doesn’t convey “what’s next” or “you’re on track.”
- **Pre-walk sheet:** The sheet has title, meta (duration · stops · km), one intro line, and the button. There’s a lot of vertical padding and one short sentence. The empty space doesn’t build anticipation (e.g. “First stop: [name]” or “You’ll hear the intro, then walk to each stop”).
- **Completion:** Between the map strip and the “Nice walk” block there’s a gap; the “Save tour to my list” at the bottom is isolated. The middle (stats + CTAs) is good; the rest feels underused.

### Replace with meaningful context

- **Active walk (main fix):**  
  - **In the gap between audio panel and voice bar:** Add a **single status line** that’s always visible, e.g.:  
    - “Next: [Next stop name] · 120m”  
    - “Listening to intro”  
    - “Stop 2 of 7”  
    - “You’re halfway through this walk” (at 50% stops)  
  This line should be the **spine** that answers “what’s happening now?” and “what’s next?” so the empty space becomes useful.
- **Pre-walk:**  
  - Add one line under the intro copy: e.g. “First stop: [first POI name]” or “You’ll hear the intro, then walk to each stop.”  
  - Optionally a short “What to expect” (1–2 bullets) to fill the sheet without clutter.
- **Completion:**  
  - Optionally one line above or below the stats: “You visited 7 stops and asked 2 questions” (if we track questions) or “Stops: 7 · Time: 32 min.”  
  - Keep “Save tour” as a secondary text button; the main focus stays on Create another / Replay / Share.

**Principle:** Every large vertical block should contain at least one piece of **progress, anticipation, or status**. No “dead” padding without a purpose.

---

## 5. LIGHTWEIGHT, HIGH-IMPACT FEATURES (NO BLOAT)

Propose 6–10 small features that are easy to implement and increase perceived quality.

1. **Next-stop distance indicator (refine)**  
   - **Problem:** User doesn’t know how far to the next stop.  
   - **Where:** Already present as “Next: [name] · 320m.” Make it the **single status line** in the empty band (see §4) so it’s always visible, not only at the bottom of the map.  
   - **Why:** Reduces uncertainty; supports “glance and go.”

2. **Subtle animation when entering a stop**  
   - **Problem:** Transition from “walking” to “at stop” can feel invisible.  
   - **Where:** When geo triggers and narration starts for a new stop, briefly highlight the active POI (e.g. a soft pulse or scale on the map marker) and/or a 1s toast: “Now at [stop name].”  
   - **Why:** Confirms “you’ve arrived” and ties map to audio.

3. **Auto-play preview when tour is ready**  
   - **Problem:** After generate, user sees “Start Walk” with no sense of what they’ll hear.  
   - **Where:** On Create page, after `generated` is set, offer a small “Play intro preview” (or “Listen to intro”) that plays the tour intro TTS once. No navigation.  
   - **Why:** Builds anticipation and validates that audio works before they commit to the walk.

4. **End-of-walk summary screen (already there; tighten)**  
   - **Problem:** Completion can feel generic.  
   - **Where:** Keep confetti, stats, and CTAs. Add one line that reinforces the loop: e.g. “You walked, you listened, you asked.” Or “7 stops · 32 min.”  
   - **Why:** Closure and brand recall.

5. **Resume walk later (lightweight)**  
   - **Problem:** If user leaves mid-walk, they may not know they can come back.  
   - **Where:** On landing or Create, if there’s a stored session with `startedAt` and no `endedAt`, show a small banner or card: “Resume your [theme] walk?” → links to `/tour/active`.  
   - **Why:** Increases completion and feels thoughtful.

6. **Progress ring around mic button (optional)**  
   - **Problem:** During “Listening,” feedback could be stronger.  
   - **Where:** VoiceBar: add a thin circular progress or pulse ring around the mic that animates while `askState === 'listening'`.  
   - **Why:** Reinforces “we’re listening” without more copy.

7. **Ambient audio toggle (optional)**  
   - **Problem:** Some users want silence between stops; others might want very low background (e.g. nature).  
   - **Where:** Settings only. Toggle “Ambient sound between stops” (default off). Implementation: optional low-volume loop or none.  
   - **Why:** Feels premium and considerate; low dev cost if implemented as on/off + one asset.

8. **Visual “haptic-style” feedback (no real haptics)**  
   - **Problem:** Actions can feel flat.  
   - **Where:** On key actions: Start Walk, Play/Pause, Hold mic (start), Release mic (end). Use a brief scale (e.g. 0.98) or opacity flash on press.  
   - **Why:** Makes the UI feel responsive and tactile.

9. **“Halfway” milestone**  
   - **Problem:** Long tours need a moment of progress.  
   - **Where:** When `visitedPoiIds.length === ceil(totalStops/2)`, show a one-time toast or status line: “You’re halfway through this walk.”  
   - **Why:** Encouragement and orientation.

10. **Typed-question entry point (clear but secondary)**  
    - **Problem:** Voice fallback (typed question) can feel hidden.  
    - **Where:** After voice fails or user cancels, show a small “Type your question instead” link that opens AskTextModal. Don’t show the modal by default on every Ask; only when we fall back or user chooses.  
    - **Why:** Accessibility and fallback without cluttering the main flow.

---

## 6. CLEAN UP SETTINGS & SECONDARY UI

### Settings drawer

- **During the walk:** Keep Settings accessible (gear icon) but **reduce scope on the active walk.**  
  - **Show:** Voice style, Language, Demo mode (if applicable).  
  - **Hide or move:** “Follow camera” — remove from Settings during walk, or default to “on” and don’t surface unless we add a “map options” sub-section.  
- **Content:** Keep Voice style and Language; they affect future TTS. Demo mode is for testing. No new heavy options.

### Typed-question fallback modal

- **When it appears:** Only when (a) voice input fails and we fall back to typed, or (b) user explicitly chooses “Type question” (e.g. from a small link after releasing mic).  
- **Do not:** Open the modal on every “Ask” or show it prominently on the main screen.  
- **Copy:** “Voice didn’t work? Type your question below.” Keep it; add optional “Or try holding the mic again.”

### Demo mode

- **Visibility:** Only show Demo mode banner and controls when `session.mode === 'demo'`.  
- **Where:** Banner at top of active walk (already); Demo-specific “Jump to next” in DebugPanel or DemoModeBanner.  
- **Default:** New tours start in real mode; demo is opt-in (e.g. from /demo or Settings).

### Debug panel

- **During walk:** Hide by default. Keep the bug icon for dev/demo; in production consider hiding it behind a long-press or env flag.  
- **Do not:** Let debug UI (API status, jump to POI) distract from the main flow. Judges and users should not need to see it.

### First-time hint (“Hold the mic…”)

- **Keep** but ensure it doesn’t cover the mic. Position (e.g. above the mic or to the side) so it’s dismissible and doesn’t block the primary action. One-time only (already).

**Summary:** Walk experience = calm and focused. Settings = minimal. Typed question = fallback only. Demo and Debug = out of the way.

---

## 7. REVISED COMPONENT STRUCTURE (HIGH LEVEL)

### Active Walk page (`app/tour/active/page.tsx`)

- **Responsibilities:** Compose layout; own `settingsOpen`, `showAskModal`, `apiStatus`, `fitBoundsTrigger`; wire `useActiveTour` and `useVoiceNext`; handle Ask start/stop and typed-question submit; render header, map, pre-walk vs active-walk branches, overlays, modals, Settings, Debug.
- **State ownership:** Page owns UI state (modals, settings); `useActiveTour` owns session, location, audio state, ask state, intro played; pass callbacks down.
- **Re-renders:** When session, userLocation, audioState, askState, introPlayed, or UI state (modal, settings) change.

### Map container

- **Component:** Keep `MapView` as the single map component. Optionally wrap it in an `ActiveWalkMap` wrapper used only on active page that: (1) passes `followUser`, `navigationMode`, `fitBoundsTrigger`; (2) receives `userLocation`, `routePoints`, `pois`, `visitedPoiIds`, `activePoiId`; (3) renders the “Next: [name] · Xm” badge **either** here or in the page (see below).
- **Responsibilities:** Display map, route, POIs, user dot; follow user when requested; fit bounds on trigger; no business logic.
- **State:** All props from parent; no internal tour state.
- **Re-renders:** When props (center, route, pois, visited, active, userLocation, followUser) change.

### Audio controls

- **Component:** Evolve `ActiveWalkAudioPanel` into the **persistent audio control surface** (see §3B). Rename optional: `ActiveWalkNowPlaying` or keep name.
- **Responsibilities:** Show current stop name, stop index (X of Y), playback progress (stop-level bar); primary Play/Pause; secondary Replay and Skip; optional “Answering…” / “Resume” hint.
- **State:** All from props (currentStopName, stopIndex, totalStops, audioState, isAnswerPlaying, showResumeHint); no internal playback state.
- **Re-renders:** When any of these props change.

### Voice interaction

- **Component:** `VoiceBar` (keep name). Evolve to: one large centered mic (Ask), optional smaller “Voice Next” (say “next”) as secondary; clear states and labels; optional progress ring when listening.
- **Responsibilities:** Render mic and optional Voice Next; handle press-and-hold (mouse and touch); call `onAskStart` / `onAskStop` and optional Voice Next handlers; display state label (Idle / Listening / Thinking / Speaking).
- **State:** `askState` and `isVoiceNextRecording` from props; no internal recording state.
- **Re-renders:** When askState or isVoiceNextRecording or voiceNextError change.

### Bottom sheets / panels

- **Pre-walk:** `PreWalkBriefingSheet` — keep. Add one line for “First stop: [name]” or “What to expect” (see §4).
- **Status line (new):** Either a small component `WalkStatusLine` that takes `{ nextStopName, nextStopDistanceM, stopIndex, totalStops, audioState }` and returns the single line (“Next: X · 120m” / “Listening to intro” / “Stop 2 of 7” / “You’re halfway…”), or inline in the active page. Prefer a small component for reuse and clarity.
- **Settings:** `SettingsDrawer` — keep; reduce options shown during walk if needed (see §6).
- **Modals:** `AskTextModal` — keep; only open on fallback or explicit “Type question.”

### Data flow (concise)

- **Page** gets session, userLocation, audioState, askState, introPlayed, currentPoi, nextPoi from `useActiveTour`; computes nextStopDistanceM, showResumeHint, showDimOverlay, etc.
- **Page** passes to MapView: center, route, pois, userLocation, visited, active, followUser, fitBoundsTrigger.
- **Page** passes to ActiveWalkAudioPanel: currentStopName, stopIndex, totalStops, audioState, isAnswerPlaying, onPlayPause, onSkip, onReplay, showResumeHint.
- **Page** passes to VoiceBar: askState, onAskStart, onAskStop, Voice Next props.
- **Page** renders WalkStatusLine (or equivalent) between audio panel and VoiceBar with the single status string.

**What re-renders when:** Session/audio/ask/UI state changes drive page re-render; children re-render via props. MapView and VoiceBar should avoid unnecessary re-renders (e.g. stable callbacks) where possible; no requirement to add memoization unless profiling shows need.

---

## 8. IMPLEMENTATION PLAN

### Prioritized list (top 5)

1. **Active walk: audio + voice hierarchy**  
   - Make the audio surface “now playing” (one primary Play/Pause; Replay/Skip secondary).  
   - Make the mic the single hero in its row (larger, centered); de-emphasize Voice Next.  
   - Add the **single status line** between audio and mic (“Next: X · 120m” / “Listening to intro” / “Stop 2 of 7”) to kill empty space.

2. **Map: navigation-only, calm**  
   - Ensure follow-user is on when appropriate; hide or minimize extra map controls (zoom/compass) in default active-walk view.  
   - Keep current/next/completed POI styling; no new map logic.

3. **Pre-walk and completion copy + one line of context**  
   - Pre-walk: add “First stop: [name]” or one “What to expect” line.  
   - Completion: add one reinforcing line (“You walked, you listened, you asked” or “7 stops · 32 min”) and keep CTAs as-is.

4. **Voice states and Resume**  
   - Ensure mic states (idle / listening / thinking / speaking) are visually distinct and transitions are immediate.  
   - Make “Resume” after answer obvious (Play/Pause shows “Resume”; one tap resumes).

5. **Settings and fallback UI**  
   - Typed-question modal only on fallback or explicit “Type question.”  
   - Debug panel hidden or behind long-press; Demo banner only in demo mode.

### What can be done in 2–4 hours

- Implement the **status line** between audio panel and VoiceBar (next stop + distance or “Listening to intro” / “Stop X of Y”).  
- Resize and center the **mic** (e.g. 80px), and move Voice Next to a smaller secondary control or text link.  
- Adjust **audio panel** layout: one large Play/Pause, smaller Replay/Skip.  
- Add **first-stop line** on PreWalkBriefingSheet and one **completion line** on the complete page.  
- **Map:** turn off or hide nonessential controls in navigation mode (if the map lib allows).

### If more time exists

- “Halfway” toast when 50% of stops visited.  
- Subtle **entering-stop** animation or toast (“Now at [name]”).  
- **Resume walk later** banner on landing/Create when a started session exists.  
- **Play intro preview** on Create after generate.  
- Optional **progress ring** around mic when listening.  
- **Ambient audio** toggle in Settings (on/off only).

### What NOT to do (scope control)

- Do **not** rewrite backend, APIs, or tour generation.  
- Do **not** add heavy new dependencies (e.g. a full mapping SDK change, complex animation libs).  
- Do **not** add many new routes or flows; keep Create → Start → Walk → Ask → Finish.  
- Do **not** over-engineer: no global state library for this; no full redesign of the Create page layout in this pass.  
- Do **not** implement phrase-level playback progress (currentTime/duration) unless the audio layer already exposes it and it’s trivial to surface.

Optimize for **impact per hour**: the status line + mic hierarchy + audio primary control will already make the app feel more audio-first and polished. Everything else is incremental.

---

*End of Product Redesign & UX Spec.*
