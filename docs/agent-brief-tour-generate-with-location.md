# Agent brief: Tour generation with user location and real POIs

Use this brief when asking an agent (AI or human) to implement the following behavior in Odyssey Walk.

---

## Goal

The **tour generate API** receives the start location from the client (it does not create or choose the location). Given that **passed-in start** and the user’s preferences, the API should:

1. **Accept the start location** in the request body: `start: { lat, lng, label }`. The client is responsible for providing this (e.g. from “Use my location”, search, or map click). The API does not create or infer the start—it uses only the location passed to it.
2. **Generate an itinerary** from:
   - The **passed-in start** (lat, lng, label)
   - User preferences (theme, duration, language, voice style)
   - **Popular tourist locations in the area** (real, plausible POIs near that start)
   - Theme and duration to **derive the number of stops** (e.g. ~1 stop per 5–8 minutes walking).
3. Call **OpenRouter** with model **GPT-4.1 mini** (e.g. `openai/gpt-4.1-mini` — confirm exact model id on [OpenRouter](https://openrouter.ai/models)) to produce structured JSON; the API then ensures each stop has: location label, short description, time to get there, date, time spent, price (if applicable), theme, and an id for ordering. **Use the OpenRouter API key that I provide** (see Configuration below).
4. **Generate a short description** for each POI/location (one or two sentences summarizing the place), included in the response and in the LLM output.
5. **Output the generated tour information** as an **organized list** in a **separate text file** with an **appropriate name**. For **each stop**, the output must include: **location (location label)**, **short description**, **time to get there**, **date**, **time spent**, **price (if applicable)**, **theme**, and an **id** to define the order of stops (and thus the path).

---

## Configuration: OpenRouter API key

- **Use the OpenRouter API key that I give you.** Do not invent or hardcode an API key.
- I will provide my key (e.g. in `.env.local` as `OPENROUTER_API_KEY`, or in instructions). The implementation must use this key for all OpenRouter requests (tour generate and any other OpenRouter calls).
- Never commit or log the key; read it from environment (e.g. `process.env.OPENROUTER_API_KEY`) or from the config I supply.

---

## Codebase context

- **App:** Next.js 14 (App Router), TypeScript. Voice-first walking tour: user picks/gets start location, gets a generated route + POIs, walks and hears narration; press-and-hold mic for Q&A (STT → OpenRouter → TTS).
- **Create flow:** `app/create/page.tsx` — user sets **starting location** (search via `PlaceSearchBox` or map click) and **preferences** in `TourGenerationPanel`, then clicks “Generate My Tour” which POSTs to `/api/tour/generate`.
- **Preferences (source of truth:** `components/TourGenerationPanel.tsx` — `TourPreferences`: `theme` (`"history" | "food" | "campus" | "spooky" | "art"`), `durationMin` (15–60), `lang` (`"en" | "fr"`), `voiceStyle` (`"friendly" | "historian" | "funny"`).
- **Generate API:** `app/api/tour/generate/route.ts` — POST body: `{ start: { lat, lng, label }, theme?, durationMin?, lang?, voiceStyle? }`. Start is required (passed by client; API does not create it). Uses OpenRouter; each POI in the response and in the text file must include: location label, short description, time to get there, date, time spent, price (if applicable), theme, and an id for ordering. Builds `TourPlan` and `POI[]`; POI lat/lng can be offsets from start (small values like 0.002 are treated as offsets).
- **Types:** `lib/types.ts` — `GeneratedTourRequest`, `GeneratedTourResponse`, `TourPlan`, `POI`, `Theme`, `Lang`, `VoiceStyle`.
- **Config:** `lib/config.ts` — `getServerConfig()` for `OPENROUTER_API_KEY`; rate limit and IP from `lib/rateLimit`, `lib/api/getClientIp`.
- **Start location is always passed in:** The API does not create or determine the start location. The client sends `start: { lat, lng, label }` in the request; the API uses it as-is. The client is responsible for how that start is chosen (e.g. current location, search, map click).

---

## Required behavior

### 1. Start location is passed to the API (client → API)

- The **client** is responsible for providing the start location. It sends `start: { lat, lng, label }` in the POST body to `/api/tour/generate`. The API does not create or choose the start—it only uses the location it receives.
- The client may obtain that location in any way (e.g. “Use my location” via Geolocation API, place search, or map click). If the client has no location, it should still send a valid `start` (e.g. a fallback or require the user to pick a place). The API expects `start` to always be present in the request.

### 2. Number of stops from duration (API)

- **Compute number of POIs** from `durationMin` so the walk fits the requested duration. Assume ~5–8 minutes per stop (walk + listen). For example:
  - 15 min → 2–3 POIs  
  - 30 min → 4–6 POIs  
  - 45 min → 5–7 POIs  
  - 60 min → 6–8 POIs  
- Pass this **target number of stops** (e.g. `numStops: 5`) into the LLM prompt so the model outputs exactly that many POIs (or a range you then cap).

### 3. Real tourist POIs in the area (API + prompt)

- The LLM must suggest **real, popular tourist-relevant places** near the **passed-in start** (lat, lng). The prompt should:
  - Include the **start coordinates and label** from the request (the API does not create this—it passes it through to the LLM).
  - Ask for **real landmarks, attractions, or notable spots** appropriate to the **theme** (history, food, campus, spooky, art) within a reasonable walking radius (e.g. 1–2 km).
  - Request **realistic lat/lng** for each POI (either absolute coordinates or small offsets from start). The API already normalizes offsets (values &lt; 0.1 and ≠ 0 are added to start).
- If you later integrate Google Places (Nearby Search or Places Details), you can pass a list of candidate places (name, place_id, lat, lng) into the prompt and ask the LLM to choose and order them and write scripts; for this brief, the LLM can infer plausible POIs from knowledge plus the given location.

### 4. OpenRouter model and prompt shape (API)

- Use **OpenRouter** with the **API key I provide** (from env or my instructions) and model **GPT-4.1 mini** (e.g. `openai/gpt-4.1-mini` — verify the exact model id on OpenRouter).
- The model must return **only** valid JSON (no markdown/code fence). Each POI must support the full per-stop output (see §5). LLM output can include fields the API then enriches (e.g. order id, time to get there, date, theme). Minimal LLM shape:

```json
{
  "intro": "30–60 word welcome script in the requested language and voice style",
  "outro": "20–40 word closing script",
  "pois": [
    {
      "name": "Place name (location label)",
      "description": "Short description of this location (1–2 sentences).",
      "lat": number,
      "lng": number,
      "script": "90–140 word narration",
      "facts": ["fact1", "fact2", "fact3", "fact4", "fact5"],
      "timeSpentMin": number,
      "price": "Free" | "$5" | null
    }
  ]
}
```

- The **API** must ensure each POI in the response and in the text file has: **location** (label, from `name` or a dedicated field), **short description**, **time to get there** (minutes from previous stop or start—compute from distance or ask LLM), **date** (tour date, e.g. from request or generation date), **time spent** (minutes at stop), **price** (if applicable; optional), **theme** (from request), and an **id** for ordering (e.g. `orderIndex` or `stopId` 1, 2, 3, …) so the path order is well-defined.
- **System prompt** should state:
  - You are a tour plan generator; output only valid JSON.
  - You receive the **start (lat, lng, label)** in the request—do not create or invent the start location; use it as the center for the tour.
  - Use the **start** and **theme** to pick **popular tourist-appropriate POIs** in that area.
  - Generate exactly **N** POIs (N = derived from duration).
  - For each POI include: **name** (location label), **short description**, **timeSpentMin** (suggested minutes at this stop), **price** if applicable (e.g. "Free", "$5", or omit).
  - Walking loop from start, back to start; safe, plausible content; scripts in the requested **lang** and **voiceStyle**.
- **User prompt** should include: start (label + lat/lng) as passed to the API, theme, duration (minutes), target number of stops, language, and voice style.

### 5. Tour output to a text file

- After generating the tour, write the tour information to a **separate text file** so it’s easy to read and share.
- **Content:** An organized list containing:
  - Intro (welcome script)
  - Outro (closing script)
  - **For each stop, in path order**, include:
    - **Location** (location label / place name)
    - **Short description**
    - **Time to get there** (e.g. minutes from previous stop or from start)
    - **Date** (tour date)
    - **Time spent** (e.g. minutes at this stop)
    - **Price** (if applicable; otherwise omit or “Free”)
    - **Theme**
    - **Id** (order id for the stop, e.g. 1, 2, 3, …) so the path order is clear
    - Optionally: coordinates (lat, lng), script, facts (as a sub-list or line items)
- **Format:** Clear headings/sections and list items (e.g. “Stop 1”, “Stop 2”, or use the order id). Keep it human-readable.
- **Filename:** Name the file appropriately—e.g. include theme and location or session id or date, such as `tour-{theme}-{location-slug}.txt`, `tour-{sessionId}.txt`, or `tour-{theme}-{YYYY-MM-DD}.txt`. Avoid overwriting previous tours unless intended (e.g. use session id or timestamp in the name).

### 6. Fallbacks and errors

- If the client sends no `start` or missing lat/lng, return 400 with a clear message (e.g. “start with lat, lng, label required”). The API does not create a default location—the client must send a valid start.
- If OpenRouter returns invalid or non-JSON, keep the existing retry/error handling (e.g. one retry with “ONLY OUTPUT JSON” and then 502 on failure).

---

## Files to touch (checklist)

- **Client (create flow):**  
  - `app/create/page.tsx`: ensure the client **always sends** a valid `start: { lat, lng, label }` (e.g. from “Use my location”, search, or map click; with a fallback or validation so the user must provide a location before generating). The API does not create the start—the client passes it.
- **API (generate):**  
  - `app/api/tour/generate/route.ts`: accept same body; require `start` from the request (no server-side default location); compute `numStops` from `durationMin`; update system/user prompts so each POI can include timeSpentMin and price; ensure each POI has **location label**, **description**, **time to get there** (computed or from LLM), **date** (tour date), **time spent**, **price** (if applicable), **theme**, and an **order id**; switch model to GPT-4.1 mini; parse and map all per-stop fields; **write the generated tour to an organized text file** with each stop including the fields above (see §5).
- **Types:**  
  - `lib/types.ts`: extend `POI` (or request/response) with: `description?`, `timeToGetThereMin?`, `timeSpentMin?`, `price?`, `tourDate?` (or at tour level); ensure `orderIndex` or `poiId` is used as the ordering id.
- **Text file output:** Implement writing the tour so **each stop** in the file includes: location (label), short description, time to get there, date, time spent, price (if applicable), theme, and id for ordering; plus intro, outro. Use a separate `.txt` file with an appropriate name (e.g. `tour-{theme}-{label}.txt` or `tour-{sessionId}.txt`).

---

## Summary for the agent

“Implement tour generation so that: (1) the **start location is always passed to** the tour/generate API by the client—the API does not create or choose the start; the client sends `start: { lat, lng, label }` with preferences to POST /api/tour/generate; (2) the API derives the number of stops from duration and calls OpenRouter GPT-4.1 mini **using the OpenRouter API key I provide**, with a prompt for real, popular tourist POIs near the passed-in start, themed; (3) **each stop** in the API response and in the text file must include: **location (location label)**, **short description**, **time to get there**, **date**, **time spent**, **price (if applicable)**, **theme**, and an **id** to order the stops and define the path; extend POI types and LLM output/parsing as needed; (4) **output the generated tour as an organized list in a separate text file named appropriately**, with each stop including the fields above; (5) if the client sends no valid start, return 400; invalid JSON from the model → retry then 502. Use the codebase and types in `app/create/page.tsx`, `app/api/tour/generate/route.ts`, `lib/types.ts`, and `components/TourGenerationPanel.tsx` as the source of truth.”
