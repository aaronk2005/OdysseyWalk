# Odyssey Walk — Project Overview & Logo Prompt

## 1. Project Description (Ground Up)

### What It Is
**Odyssey Walk** is a **voice-first, mobile-first walking tour app**. Users pick a start location, generate a custom tour (route + points of interest) via AI, then walk and hear narrated stories at each stop. They can press-and-hold the mic to ask questions; answers are spoken back via TTS. The product is framed as **audio-first** and **walking-mode**: the map supports the experience; listening and asking are the hero.

### Core Loop
1. **Create** (`/create`) — Set start (search or map click), theme, duration, language, voice. Generate tour via OpenRouter (intro, outro, 5–8 POIs with scripts).
2. **Start Walk** — Pre-walk briefing (map + bottom sheet), then “Start Walk.”
3. **Active Walk** (`/tour/active`) — Intro plays, then GPS or demo movement. At each POI, narration plays automatically. Hold mic for Q&A (STT → OpenRouter → TTS).
4. **Complete** (`/tour/complete`) — Outro, summary, “Save Tour,” “Generate Another.”
5. **Demo** (`/demo`) — 90-second scripted demo without mic/GPS.

### Tech Stack
- **Frontend:** Next.js 14 (App Router), TypeScript, TailwindCSS, Framer Motion
- **Font:** Plus Jakarta Sans (400, 500, 600, 700, 800)
- **APIs:** Google Maps (map + Places), OpenRouter (tour generation + Q&A), optional Gradium (STT/TTS)

### Color Scheme
- **Background:** `#f1f5f9` (light slate gray) — `--app-bg` / `app.bg`
- **Surface:** `#ffffff` — cards, panels, header
- **Ink (text):**
  - Primary: `#0f172a` (slate-900)
  - Secondary: `#64748b` (slate-500)
  - Tertiary: `#94a3b8` (slate-400)
- **Brand primary:** `#0d9488` (teal) — main CTAs, links, route line, active states
- **Brand primary hover:** `#0f766e`
- **Brand secondary:** `#f97316` (orange) — accent (e.g. highlights, secondary actions)
- **Brand secondary hover:** `#ea580c`
- **Borders:** `#e2e8f0` (slate-200)
- **Gradients:** Teal gradient for glow (`#0d9488` → `#14b8a6` → `#2dd4bf`), hero gradient (app-bg → border)

### Typography & UI
- **Headings:** Bold (700–800), tight letter-spacing (-0.02em to -0.04em)
- **Body:** ~15px base, 1.6 line-height
- **Touch targets:** Minimum 44px
- **Border radius:** Cards 1rem, buttons 0.75rem
- **Vibe:** Clean, calm, premium mobile-first; teal as the signature color; no clutter

### Design Principles (from UX spec)
- **Audio-first** — Audio is the product; map supports it.
- **Walking mode** — Phone-in-pocket; glanceable UI; few, large primary actions.
- **Single primary loop** — Create → Start → Walk → Ask → Finish.

### Current Logo
The app currently uses a **wordmark only**: “Odyssey Walk” in Plus Jakarta Sans, bold, tight tracking, `text-ink-primary` (#0f172a). There is a `public/logo.png` and an `OdysseyLogo` component that renders the text only (no icon).

---

## 2. Logo Prompt (for Gemini, ChatGPT, Claude)

Copy the block below into Gemini, ChatGPT, or Claude to generate logo concepts for **Odyssey Walk**. Ask for multiple variants (e.g. icon only, icon + wordmark, favicon) and for both light and dark backgrounds if needed.

---

**PROMPT START**

Design a logo for **Odyssey Walk**, a voice-first walking tour app. The product lets users generate and follow narrated walking tours in cities, with a map and hold-to-talk Q&A. It is mobile-first, audio-first, and calm/premium in feel.

**Requirements:**
- **Name:** Odyssey Walk
- **Colors:** Primary brand color is **teal #0d9488** (can use shades #14b8a6, #2dd4bf). Secondary accent **orange #f97316** is optional. Text/icon on light backgrounds should work in **#0f172a** (dark slate). On teal, use white.
- **Style:** Modern, clean, minimal. No clip art or busy illustrations. Should read as a premium app icon and header logo. Think: journey, walking, path, voice/audio, discovery — but abstract or symbolic, not literal (e.g. a path, footprint, sound wave, or “O” that suggests motion).
- **Outputs to produce:**
  1. **App icon:** Square, works at 512×512 and 192×192. Single mark or “O” + minimal wordmark that scales down.
  2. **Header logo:** Horizontal lockup for website/app header: icon + “Odyssey Walk” wordmark. Readable at ~40px height.
  3. **Favicon:** Simple mark that works at 32×32 and 16×16 (e.g. “O” or abstract path/sound symbol).
- **Constraints:** No gradients in the mark unless very subtle. Prefer solid teal (#0d9488) and white/dark slate. Must be legible on both white (#ffffff) and light gray (#f1f5f9) backgrounds. Font for wordmark: sans-serif, bold, modern (e.g. Plus Jakarta Sans style).
- **Deliverable:** Describe each concept clearly and, if the tool supports it, output SVG or high-resolution PNG. If generating images, provide one version on white and one on #f1f5f9.

**PROMPT END**

---

## 3. Quick Color Reference (for logo assets)

| Token        | Hex       | Use              |
|-------------|-----------|-------------------|
| Brand teal  | `#0d9488` | Primary logo/CTA  |
| Teal light  | `#14b8a6` | Highlights        |
| Teal pale   | `#2dd4bf` | Gradients         |
| Ink         | `#0f172a` | Wordmark on light |
| White       | `#ffffff` | Icon/wordmark on teal |
| App bg      | `#f1f5f9` | Page background   |

Use this doc for onboarding and for AI-generated logo briefs.
