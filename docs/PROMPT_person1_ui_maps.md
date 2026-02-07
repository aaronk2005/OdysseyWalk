# Cursor Agent Prompt: UI + Maps + Client Orchestration (Person 1)

You are a senior full-stack engineer working on **Odyssey Walk**, a voice-first walking tour app. You own the **entire client-side experience**: Google Maps integration, all UI pages, bottom sheet player, and client state orchestration.

---

## 🎯 Your Role: Person 1 - UI + Maps + Client Orchestration

**You own:**
- Google Maps integration (map click, Places autocomplete, POI markers, route polylines)
- All pages: `/`, `/create`, `/tour/active`, `/tour/complete`, `/demo`
- Bottom sheet player UI (collapsed/expanded states, audio controls, mic button)
- Settings drawer and debug panel
- Geofence trigger wiring (client-side only)
- Demo mode with simulated movement

**You DO NOT own:**
- Voice/audio backend endpoints (`/api/stt`, `/api/tts`) - Person 2 owns these
- AI/tour generation (`/api/tour/generate`, `/api/qa`) - Person 3 owns these
- You call these endpoints as **black boxes**

---

## 📚 Context: Project Status

### ✅ What's Already Done (Scaffolding Exists)
- **Types**: `lib/types.ts` has all domain types (`POI`, `TourPlan`, `SessionState`, etc.)
- **SessionStore**: `lib/data/SessionStore.ts` handles localStorage persistence
- **AudioSessionManager**: `lib/audio/AudioSessionManager.ts` manages TTS playback
- **VoiceController**: `lib/voice/VoiceController.ts` handles STT/TTS integration
- **Geo providers**: `lib/geo/GeoProvider.ts` (real GPS), `lib/geo/GeoSimProvider.ts` (demo)
- **GeoTriggerEngine**: `lib/geo/GeoTriggerEngine.ts` (POI proximity detection)
- **API routes**: All backend endpoints are implemented (generate, qa, stt, tts)
- **Components**: Scaffolds exist but need full implementation
- **Hook**: `hooks/useActiveTour.ts` exists but needs integration

### 🚧 What Needs Implementation (Your Tasks)

You have **5 major deliverables**:

1. **`/create` page**: Map + search + preferences + generate + Start Walk
2. **`/tour/active` page**: Full active tour experience with map + player + Q&A
3. **Settings drawer + Debug panel**: Demo mode toggle, API status, jump controls
4. **Demo mode**: Simulated movement + scripted demo
5. **Completion screen**: Summary with save + generate another

---

## 📋 Deliverable 1: `/create` Page

**Goal**: User selects start location, sets preferences, generates tour, sees route on map.

### Files to Modify
- `app/create/page.tsx` ✅ (exists, needs full wiring)
- `components/MapView.tsx` ✅ (exists, `onMapClick` already added)
- `components/PlaceSearchBox.tsx` ✅ (exists, needs Google Places integration)
- `components/TourGenerationPanel.tsx` ✅ (exists, needs UI)

### Implementation Tasks

#### Task 1.1: Google Maps with Click-to-Set-Start
```typescript
// In app/create/page.tsx
const [startPlace, setStartPlace] = useState<PlaceResult | null>(null);

// Wire map click handler (already in MapView)
const handleMapClick = useCallback((lat: number, lng: number) => {
  const place: PlaceResult = { lat, lng, label: "Dropped pin" };
  setStartPlace(place);
  setSearchLabel("Dropped pin");
}, []);

// Pass to MapView
<MapView
  mapApiKey={mapKey}
  center={center}
  onMapClick={handleMapClick}  // ✅ Already wired
  userLocation={startPlace ? { lat: startPlace.lat, lng: startPlace.lng } : null}
  // ... other props
/>
```

**Test**: Click map → green pin appears with "Dropped pin" label.

---

#### Task 1.2: Places Autocomplete Search
```typescript
// In components/PlaceSearchBox.tsx
// Uses Google Places Autocomplete API
// On place select: call onPlaceSelect({ label, lat, lng })

// Wire in create page:
<PlaceSearchBox
  value={searchLabel}
  onChange={setSearchLabel}
  onPlaceSelect={handlePlaceSelect}
  mapApiKey={mapKey}
/>
```

**Test**: Type "Union Square SF" → select from dropdown → pin moves to location.

---

#### Task 1.3: Tour Generation Panel UI
```typescript
// In components/TourGenerationPanel.tsx
// Build UI with:
// - Theme selector: radio buttons or dropdown (history, food, campus, spooky, art)
// - Duration slider: 15-90 minutes
// - Language toggle: en/fr
// - Voice style: friendly, historian, funny
// - "Generate My Tour" button with loading spinner

interface TourPreferences {
  theme: Theme;
  durationMin: number;
  lang: Lang;
  voiceStyle: VoiceStyle;
}
```

**Styling**: Use Tailwind with glassmorphism (bg-white/5, backdrop-blur, rounded-xl).

---

#### Task 1.4: Wire Generate Flow
```typescript
// In app/create/page.tsx
const handleGenerate = useCallback(async () => {
  setGenerating(true);
  setError(null);
  
  try {
    const res = await fetch('/api/tour/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        start: { lat: startPlace.lat, lng: startPlace.lng, label: startPlace.label },
        theme: preferences.theme,
        durationMin: preferences.durationMin,
        lang: preferences.lang,
        voiceStyle: preferences.voiceStyle,
      }),
    });
    
    if (!res.ok) throw new Error('Generate failed');
    
    const data: GeneratedTourResponse = await res.json();
    
    // Save to SessionStore
    saveTour(data.sessionId, data);
    setGenerated(data);
    
    // Render route on map
    // (MapView already handles routePoints prop)
    
  } catch (e) {
    setError(e instanceof Error ? e.message : 'Generation failed');
    toast.showToast(error, 'error');
  } finally {
    setGenerating(false);
  }
}, [startPlace, preferences]);
```

**Test**: Click generate → spinner shows → route + POIs appear on map after 3-8s.

---

#### Task 1.5: Start Walk Button
```typescript
// After successful generate:
<button onClick={() => router.push('/tour/active')}>
  Start Walk
</button>

// Tour is already saved via saveTour(), active page will load it
```

---

### Acceptance Criteria (Deliverable 1)
- [ ] Map loads with search bar and click-to-pin working
- [ ] Places autocomplete works and updates map
- [ ] Preferences panel has all controls (theme, duration, lang, voice)
- [ ] Generate button sends correct JSON to `/api/tour/generate`
- [ ] Route polyline + POI markers render on map after successful generate
- [ ] Error toast appears on failure with retry option
- [ ] "Start Walk" navigates to `/tour/active`
- [ ] Map gracefully handles missing `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` (shows placeholder)

---

## 📋 Deliverable 2: `/tour/active` Page

**Goal**: Full active tour experience with map, audio player, POI triggers, Q&A flow.

### Files to Modify
- `app/tour/active/page.tsx` ✅ (exists, needs full wiring)
- `components/BottomSheetPlayer.tsx` ✅ (exists, needs premium UI)
- `hooks/useActiveTour.ts` ✅ (exists, needs integration)

### Implementation Tasks

#### Task 2.1: Load Session and Render Map
```typescript
// In app/tour/active/page.tsx
const {
  session,
  userLocation,
  audioState,
  startWalk,
  currentPoi,
  nextPoi,
  // ... other methods from useActiveTour
} = useActiveTour();

if (!session) {
  return <LoadingSpinner />; // or redirect to /create
}

// Render map with route + POIs
<MapView
  mapApiKey={mapKey}
  center={userLocation ?? { lat: session.pois[0].lat, lng: session.pois[0].lng }}
  routePoints={session.tourPlan.routePoints}
  pois={session.pois}
  userLocation={userLocation}
  visitedPoiIds={session.visitedPoiIds}
  activePoiId={session.activePoiId}
  followUser={true}
/>
```

**POI Marker Colors** (already in MapView):
- **Blue**: Unvisited
- **Gray**: Visited
- **Purple**: Active (current POI)

---

#### Task 2.2: Start Walk Button (Before Intro)
```typescript
// Show button before intro plays
{!introPlayed ? (
  <div className="bottom-panel">
    <button onClick={startWalk}>Start Walk</button>
  </div>
) : (
  <BottomSheetPlayer {...playerProps} />
)}
```

**What `startWalk()` does** (already in hook):
1. Play intro via `AudioSessionManager.playIntro()`
2. Start geo provider (real or demo based on session.mode)
3. Set `introPlayed = true` to show player

---

#### Task 2.3: Build Premium Bottom Sheet Player
```typescript
// In components/BottomSheetPlayer.tsx
// Two states: collapsed and expanded

// Collapsed state (default):
// - Current POI name
// - Progress bar: "Stop 3 of 7"
// - Play/Pause button
// - ChevronUp to expand

// Expanded state:
// - Full POI script text
// - Audio controls: Play/Pause, Skip, Replay
// - Mic button (press-and-hold)
// - Next POI info: "Next: Historic Plaza"
// - Estimated distance to next (optional)

const [expanded, setExpanded] = useState(false);

return (
  <motion.div
    className="fixed bottom-0 left-0 right-0 z-40"
    animate={{ height: expanded ? 'auto' : '120px' }}
  >
    {/* Glassmorphism styling */}
    <div className="bg-navy-900/95 backdrop-blur-xl rounded-t-3xl">
      <button onClick={() => setExpanded(!expanded)}>
        <ChevronUp className={expanded ? 'rotate-180' : ''} />
      </button>
      
      {/* Collapsed content: POI name, progress, play/pause */}
      <div>
        <h2>{currentPoi?.name ?? 'Select a stop'}</h2>
        <ProgressBar visited={visitedCount} total={totalCount} />
        <button onClick={isPlaying ? onPause : onResume}>
          {isPlaying ? <Pause /> : <Play />}
        </button>
      </div>
      
      {/* Expanded content: script text, all controls */}
      <AnimatePresence>
        {expanded && (
          <motion.div>
            <p className="script-text">{currentPoi?.script}</p>
            <div className="controls">
              <button onClick={onSkipNext}><SkipForward /></button>
              <button onClick={onReplay}><RotateCcw /></button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Mic button (always visible) */}
      <button
        onMouseDown={onAskStart}
        onMouseUp={onAskStop}
        onTouchStart={onAskStart}
        onTouchEnd={onAskStop}
        className="mic-button"
      >
        <Mic />
      </button>
      {isAsking && <p>{askState}</p>} {/* "Listening...", "Thinking...", "Speaking..." */}
    </div>
  </motion.div>
);
```

**Styling**:
- Dark glossy: `bg-navy-900/95`
- Glassmorphism: `backdrop-blur-xl`
- Big rounded corners: `rounded-t-3xl`
- Smooth transitions: Framer Motion

---

#### Task 2.4: Wire POI Trigger Logic
```typescript
// Already implemented in useActiveTour.ts
// When user enters POI radius:
// 1. GeoTriggerEngine emits trigger event
// 2. useActiveTour calls AudioSessionManager.playPoiScript(poi)
// 3. Updates session.visitedPoiIds
// 4. Bottom sheet shows current POI

// Your job: Ensure BottomSheetPlayer reflects state correctly
// - Show current POI name
// - Update progress (X of Y)
// - Show audio playing state
```

**Test**: In demo mode, click "Next stop" → teleport to POI → narration plays → player updates.

---

#### Task 2.5: Wire Mic Button (Press-and-Hold Q&A)
```typescript
// In app/tour/active/page.tsx
const handleAskStart = useCallback(() => {
  setAskState('listening');
  startRecording({
    onListeningEnd: () => setAskState('idle'),
    onThinking: () => setAskState('thinking'),
    onAnswerStart: () => setAskState('speaking'),
    onAnswerEnd: () => setAskState('idle'),
    onTypedQuestionFallback: () => setShowAskModal(true), // STT failed
    onError: (err) => toast.showToast(err, 'error'),
  });
}, []);

const handleAskStop = useCallback(() => {
  stopRecording();
}, []);

// Pass to BottomSheetPlayer
<BottomSheetPlayer
  onAskStart={handleAskStart}
  onAskStop={handleAskStop}
  isAsking={askState !== 'idle'}
  askState={askState}
/>
```

**Flow** (already implemented in VoiceController):
1. User presses mic → `startRecording()` → show "Listening..."
2. User releases → send audio to `/api/stt` → get transcript
3. Send transcript to `/api/qa` → get answer
4. Send answer to `/api/tts` → play audio
5. If STT fails → show typed question modal

**Test**: Press and hold mic → "Listening..." → release → "Thinking..." → answer plays.

---

#### Task 2.6: Handle Last POI → Outro → Complete
```typescript
// Already in useActiveTour:
// When last POI visited:
// 1. Play outro via AudioSessionManager.playOutro()
// 2. Navigate to /tour/complete

// Your job: Ensure smooth transition
// Player should show "Tour ending..." or similar
```

---

### Acceptance Criteria (Deliverable 2)
- [ ] Map shows route + user location + POI markers with correct colors
- [ ] "Start Walk" button plays intro and starts geo tracking
- [ ] POI trigger automatically plays narration when user enters radius
- [ ] Bottom sheet shows current POI, progress ("Stop 3 of 7"), audio controls
- [ ] Play/Pause/Skip/Replay buttons work correctly
- [ ] Mic button records audio and completes full Q&A flow
- [ ] Typed question fallback works when STT unavailable
- [ ] Last POI triggers outro and navigates to `/tour/complete`
- [ ] Bottom sheet doesn't obscure map (proper z-index and height)

---

## 📋 Deliverable 3: Settings Drawer + Debug Panel

### Files to Modify
- `components/SettingsDrawer.tsx` ✅ (exists, needs full UI)
- `components/DebugPanel.tsx` ✅ (exists, needs API status integration)

### Task 3.1: Settings Drawer
```typescript
// In components/SettingsDrawer.tsx
// Slide-in from right with:
// - Demo mode toggle (switch between "real" and "demo")
// - Voice style selector (friendly, historian, funny)
// - Language toggle (en, fr)
// - Follow camera toggle (pan map to user location)

// Wire in active page:
const [settingsOpen, setSettingsOpen] = useState(false);

const handleDemoModeChange = useCallback((demo: boolean) => {
  updateSession({ mode: demo ? 'demo' : 'real' });
  refreshSession(); // from useActiveTour
}, []);

<SettingsDrawer
  open={settingsOpen}
  onClose={() => setSettingsOpen(false)}
  demoMode={session.mode === 'demo'}
  onDemoModeChange={handleDemoModeChange}
  voiceStyle="friendly"
  onVoiceStyleChange={(v) => AudioSessionManager.setOptions({ voiceStyle: v })}
  lang="en"
  onLangChange={(l) => AudioSessionManager.setOptions({ lang: l })}
/>
```

**Test**: Toggle demo mode → banner appears with "Next stop" button.

---

### Task 3.2: Debug Panel
```typescript
// In components/DebugPanel.tsx
// Expandable panel (bottom-left) with:
// - API status (green/red): Maps, OpenRouter, Gradium
// - Current lat/lng
// - Audio state (IDLE, NARRATING, etc.)
// - "Jump to POI" buttons (teleport in demo mode)
// - "Play next POI" button
// - "Clear audio cache" button
// - Last error display

// Fetch API status on mount:
useEffect(() => {
  fetch('/api/health')
    .then(r => r.json())
    .then(d => setApiStatus({
      mapsKeyPresent: d.mapsKeyPresent,
      openRouterConfigured: d.openRouterConfigured,
      gradiumConfigured: d.gradiumConfigured,
    }));
}, []);

// Wire in active page:
<DebugPanel
  pois={session.pois}
  visitedPoiIds={session.visitedPoiIds}
  onJumpToPoi={(poiId) => {
    const poi = session.pois.find(p => p.poiId === poiId);
    if (poi) playPoi(poi);
  }}
  onForceTriggerNext={jumpNext}
  onClearAudioCache={clearAudioCache}
  userLat={userLocation?.lat}
  userLng={userLocation?.lng}
  audioState={audioState}
  apiStatus={apiStatus}
  lastError={lastError}
/>
```

**Test**: Click Bug icon → panel opens → see API status → click "Jump to POI 3" → teleport + narration plays.

---

### Acceptance Criteria (Deliverable 3)
- [ ] Settings icon in header opens drawer
- [ ] Demo mode toggle switches geo provider immediately
- [ ] Debug panel shows API status with green/red indicators
- [ ] "Jump to POI" teleports user and triggers narration in demo mode
- [ ] "Clear audio cache" resets TTS cache
- [ ] Last error displays when API calls fail

---

## 📋 Deliverable 4: Demo Mode + Simulated Movement

### Files to Modify
- `components/DemoModeBanner.tsx` ✅ (exists, needs link to /demo)
- `app/demo/page.tsx` ✅ (exists, needs scripted demo implementation)

### Task 4.1: Demo Mode Banner
```typescript
// In components/DemoModeBanner.tsx
// Shows when session.mode === 'demo'
// - "Demo mode: simulated movement" label
// - "Next stop" button → calls onJumpNext()
// - "Run 90s Demo" link → navigates to /demo

// Wire in active page:
{session.mode === 'demo' && (
  <DemoModeBanner
    onJumpNext={jumpNext}
    onRunScriptedDemo={() => {}} // ✅ Already added
  />
)}
```

---

### Task 4.2: Scripted Demo Page
```typescript
// In app/demo/page.tsx
// Hardcoded 2-POI tour (no API calls needed)
// "Run 90s Demo" button runs:
// 1. Play intro (skip or short)
// 2. Play POI 1 script (6 seconds)
// 3. Send sample Q&A to /api/qa → play answer (5 seconds)
// 4. Play POI 2 script (6 seconds)
// 5. Show "Done"

const DEMO_SESSION: GeneratedTourResponse = {
  sessionId: 'demo-90',
  tourPlan: {
    intro: 'Welcome to this short demo...',
    outro: 'Demo complete.',
    theme: 'demo',
    estimatedMinutes: 5,
    routePoints: [/* 2-3 points */],
  },
  pois: [/* 2 POIs with short scripts */],
};

const run90SecondDemo = async () => {
  setRunning(true);
  saveTour(DEMO_SESSION.sessionId, DEMO_SESSION);
  
  setStep('Playing stop 1...');
  await AudioSessionManager.playPoiScript(DEMO_SESSION.pois[0]);
  await new Promise(r => setTimeout(r, 6000));
  
  setStep('Sample Q&A...');
  const res = await fetch('/api/qa', { /* ... */ });
  const { answerText } = await res.json();
  await AudioSessionManager.playAnswer(answerText);
  await new Promise(r => setTimeout(r, 5000));
  
  setStep('Playing stop 2...');
  await AudioSessionManager.playPoiScript(DEMO_SESSION.pois[1]);
  await new Promise(r => setTimeout(r, 6000));
  
  setStep('Done.');
  setRunning(false);
};
```

**Test**: Click "Run 90s Demo" → see progress through all steps → no errors.

---

### Acceptance Criteria (Deliverable 4)
- [ ] Demo mode banner appears when `session.mode === 'demo'`
- [ ] "Next stop" button teleports to next POI and triggers narration
- [ ] `/demo` page runs full scripted flow without user interaction
- [ ] Permission denied on real mode auto-switches to demo (already in useActiveTour)

---

## 📋 Deliverable 5: Completion Screen

### Files to Modify
- `app/tour/complete/page.tsx` ✅ (exists, needs wiring)
- `components/CompletionSummary.tsx` ✅ (exists, needs UI)

### Task 5.1: Completion Summary
```typescript
// In app/tour/complete/page.tsx
const [session, setSession] = useState(loadTour());

useEffect(() => {
  const s = loadTour();
  if (s && !s.endedAt) {
    updateSession({ endedAt: Date.now() });
    setSession(loadTour());
  }
}, []);

const handleSaveTour = () => {
  const saved = JSON.parse(localStorage.getItem('odyssey-saved-tours') ?? '[]');
  saved.push({ ...session, savedAt: Date.now() });
  localStorage.setItem('odyssey-saved-tours', JSON.stringify(saved));
  toast.showToast('Tour saved!', 'success');
};

<CompletionSummary
  session={session}
  onSaveTour={handleSaveTour}
  onGenerateAnother={() => router.push('/create')}
/>
```

```typescript
// In components/CompletionSummary.tsx
// Show:
// - Checkmark icon + "Tour completed"
// - Stats: stops visited (X of Y), approx. time, distance
// - List of visited POI names with checkmarks
// - "Save Tour" button → persist to localStorage
// - "Generate Another" link → navigate to /create
```

**Test**: Complete tour → see summary with stats → click "Save Tour" → toast confirms → click "Generate Another" → navigate to /create.

---

### Acceptance Criteria (Deliverable 5)
- [ ] Completion screen shows after last POI outro
- [ ] Summary displays stops visited, time, distance (if available)
- [ ] "Save Tour" persists to localStorage
- [ ] "Generate Another" redirects to `/create`

---

## 🔧 Integration Points (How to Call Backend APIs)

### API Contract Summary

**You call these as black boxes** (Person 2 and 3 own implementation):

#### POST /api/tour/generate
```typescript
const res = await fetch('/api/tour/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    start: { lat, lng, label },
    theme: 'history',
    durationMin: 30,
    lang: 'en',
    voiceStyle: 'friendly',
  }),
});
const data: GeneratedTourResponse = await res.json();
```
**Timeout**: 15s | **Error**: Show toast + retry | **Fallback**: Load from `/public/tours/fallback.json`

#### POST /api/qa
```typescript
const res = await fetch('/api/qa', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    sessionId: session.sessionId,
    poiId: currentPoi.poiId,
    questionText: 'When was this built?',
    context: {
      currentPoiScript: currentPoi.script,
      tourIntro: session.tourPlan.intro,
      theme: session.tourPlan.theme,
    },
  }),
});
const { answerText } = await res.json();
```
**Timeout**: 10s | **Error**: Use fallback answer from error response

#### POST /api/stt (via VoiceController)
```typescript
// Already wrapped in startRecording()
startRecording({
  onTranscript: (text) => { /* send to Q&A */ },
  onError: () => { /* show typed question modal */ },
});
```

#### POST /api/tts (via AudioSessionManager)
```typescript
// Already wrapped
await AudioSessionManager.playIntro(tourPlan.intro);
await AudioSessionManager.playPoiScript(poi);
await AudioSessionManager.playAnswer(answerText);
```
**Fallback**: Display text if TTS fails

---

## 🎨 UI/UX Requirements

### Premium Theme
- **Dark glossy**: `bg-navy-950`, `bg-navy-900`
- **Glassmorphism**: `bg-white/5 backdrop-blur-xl`
- **Big rounded corners**: `rounded-2xl`, `rounded-3xl`
- **Gradients**: `bg-gradient-to-r from-accent-blue to-accent-purple`
- **Shadows**: `shadow-xl`, `shadow-2xl`

### Animations (Framer Motion)
```typescript
import { motion, AnimatePresence } from 'framer-motion';

// Bottom sheet expand/collapse
<motion.div
  initial={{ height: 120 }}
  animate={{ height: expanded ? 'auto' : 120 }}
  transition={{ type: 'spring', damping: 25 }}
/>

// Toast notification
<AnimatePresence>
  {visible && (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
    />
  )}
</AnimatePresence>
```

### Mobile-First
- Bottom sheet must not obscure map (proper z-index)
- Touch-friendly controls (min 44px tap targets)
- Safe area padding: `safe-bottom` class
- Prevent overscroll: `overscroll-behavior-y: none`

---

## ✅ Definition of Done (Before Considering Complete)

Your work is done when:

- [ ] **Build succeeds**: `npm run build` completes without errors
- [ ] **All 5 deliverables complete** with acceptance criteria met
- [ ] **Generate tour works**: Create page → generate → route renders
- [ ] **Start walk works**: Intro plays → active page loads
- [ ] **POI trigger works**: Reach POI → narration plays
- [ ] **Progress updates**: Bottom sheet shows "Stop X of Y"
- [ ] **Q&A works**: Press mic → record → answer plays (or typed fallback)
- [ ] **Completion screen**: Last POI → outro → complete screen
- [ ] **Demo mode**: Toggle demo → "Next stop" button works
- [ ] **Mobile responsive**: Works on iPhone/Android viewport
- [ ] **No console errors**: No unhandled exceptions
- [ ] **Graceful degradation**: Missing API keys → fallback modes work
- [ ] **Settings persist**: Voice style change persists across narrations
- [ ] **Debug panel works**: API status correct, jump works in demo

---

## 🧪 Testing Checklist

Run through this flow before marking complete:

1. **Create Flow**:
   - Open `/create`
   - Click map → pin appears
   - Search "Union Square SF" → pin moves
   - Select theme "history", 30min, en, friendly
   - Click "Generate" → route + POIs appear
   - Click "Start Walk" → navigate to `/tour/active`

2. **Active Tour Flow**:
   - Map shows route + user location
   - Click "Start Walk" → intro plays
   - In demo mode: click "Next stop" → teleport → narration plays
   - Bottom sheet shows current POI, progress
   - Press mic → "Listening..." → answer plays
   - Reach last POI → outro → redirect to `/tour/complete`

3. **Settings/Debug**:
   - Open Settings → toggle demo mode → banner appears
   - Open Debug → see API status → click "Jump to POI 3" → works

4. **Demo Page**:
   - Navigate to `/demo`
   - Click "Run 90s Demo" → see all steps complete

5. **Completion**:
   - See summary with visited stops
   - Click "Save Tour" → toast confirms
   - Click "Generate Another" → return to `/create`

---

## 📖 Reference Documentation

- **Integration Contracts**: `docs/integration_contracts.md`
- **Team Plan**: `docs/next_steps_team_plan.md` (your section: Person 1)
- **Demo Checklist**: `docs/demo_checklist.md`

---

## 🚀 Getting Started

### Step 1: Set up env vars
```bash
# In .env.local
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_key_here
```

### Step 2: Start dev server
```bash
npm run dev
```

### Step 3: Work in this order
1. Start with `/create` page (Deliverable 1)
2. Move to `/tour/active` (Deliverable 2)
3. Add Settings/Debug (Deliverable 3)
4. Wire demo mode (Deliverable 4)
5. Polish completion (Deliverable 5)

### Step 4: Test frequently
- Test each page as you build
- Use demo mode to avoid GPS dependencies
- Check mobile viewport (iPhone 12/13/14 size)

---

## ⚠️ Common Pitfalls to Avoid

1. **Bottom sheet z-index**: Don't let it cover the map completely
2. **Audio state**: Always check `audioState` before playing/pausing
3. **Session updates**: Call `refreshSession()` after `updateSession()`
4. **Mic permissions**: Handle denial gracefully (show typed question modal)
5. **Map key missing**: Gracefully degrade to text-only mode
6. **Toast spam**: Debounce error toasts (don't show 5 errors at once)

---

## 🎯 Success Criteria

You'll know you're done when:
- A judge can generate a tour, walk it (in demo mode), ask questions, and complete it
- The UI looks premium (dark glossy, smooth animations)
- Everything works on mobile viewport
- Fallbacks handle missing API keys gracefully
- No console errors during normal flow

Good luck! 🚀
