# Odyssey Walk — Pitch Script

## 3-minute pitch

**[0:00] Hook**  
"Odyssey Walk is a premium, mobile-first audio tour guide. Imagine walking through a city—the moment you reach a landmark, you hear its story. No tapping. No staring at your phone. Walk, listen, and when you're curious, press and hold to ask a question. You get an answer grounded in that stop's facts, spoken back in real time."

**[0:30] Live demo steps**  
"Here's the flow: open a tour, see the map and route. In demo mode we simulate movement so you don't need GPS. Tap Play—first stop narrates. Tap Next stop or use the debug panel to jump. Hold the mic, ask 'When was it built?'—we send your voice to our backend, OpenRouter answers, Gradium speaks it back. If voice fails, you can type the question. Every step works without permissions on the 90-second demo page."

**[1:00] Technical architecture**  
"We use Next.js 14 App Router and keep all secrets server-side: only the Google Maps key is public. OpenRouter and Gradium keys never touch the client. A single controller hook—`useTourController`—orchestrates location, geofence triggers, audio state, and the voice Q&A loop. Geofencing uses hysteresis and cooldowns so we don't double-trigger. Audio has ducking when you interrupt for the mic, and we cache narration by POI and voice style."

**[1:30] Why Gradium + OpenRouter**  
"Gradium gives us high-quality TTS and STT so the experience feels natural. OpenRouter lets us plug in a capable LLM for Q&A without running our own models. We ground answers in POI scripts and facts to avoid hallucination. If the LLM or TTS is down, we fall back to canned answers from facts and a 'Try audio again' or text modal—so the app never dead-ends."

**[2:00] Scalability + accessibility**  
"The design is mobile-first and accessible: hands-free narration, optional screen, and a clear progress bar and next-stop info. We rate-limit API calls and validate config at runtime. For scale, tours are JSON today; the same flows would work with a real backend and auth. We'd love to show the tour page, the 90-second demo, and the Create Tour flow. Thanks."

---

## Q&A answers (bullets)

- **Geofencing:** Next 3 unvisited POIs; effective radius = POI radius + clamped accuracy; enter/exit hysteresis; one trigger per tick; 60s cooldown per POI.
- **No Gradium/OpenRouter keys:** Demo mode, map (with Maps key), and tour list work. TTS → placeholder or text + "Try audio again"; STT → text input modal; LLM → canned answer from POI facts.
- **Tour data:** JSON in `public/tours`; generated tours in-memory + localStorage.
- **Hallucination:** POI script and facts sent as context; model instructed to be short and not invent; fallback to facts if error.
- **Demo by default:** So judges and users can run the full flow without GPS or mic.
- **Rate limiting:** In-memory per-IP per endpoint for /api/qa, /api/tts, /api/stt; 429 with Retry-After.
- **Security:** Only NEXT_PUBLIC_GOOGLE_MAPS_API_KEY on client; health endpoint reports which services are configured.
