# Quick Start: Gradium API Setup

## 🚀 Get Started in 3 Steps

### Step 1: Get Your API Key

**Option A - Standard Gradium (Easiest):**
1. Go to https://gradium.ai
2. Sign up and create an API key
3. Your key will look like: `gd_abc123...`

**Option B - Competition Key:**
- Check your competition email/portal for a key like `gsk_...`
- ⚠️ You may need competition-specific endpoints (see below)

---

### Step 2: Update .env.local

Open `/home/aaron-kleiman/Downloads/OdysseyWalk/.env.local` and set:

```bash
# Your API key
GRADIUM_API_KEY=gd_your_key_here

# Choose EU or US based on your location (EU is usually faster in Europe/Africa)
GRADIUM_TTS_WS_URL=wss://eu.api.gradium.ai/api/speech/tts
GRADIUM_TTS_URL=https://eu.api.gradium.ai/api/post/speech/tts
```

**North America/Asia?** Use US endpoints instead:
```bash
GRADIUM_TTS_WS_URL=wss://us.api.gradium.ai/api/speech/tts
GRADIUM_TTS_URL=https://us.api.gradium.ai/api/post/speech/tts
```

---

### Step 3: Restart & Test

```bash
# Restart your dev server
npm run dev

# Test it works
curl http://localhost:3000/api/health
```

✅ Look for `"gradiumConfigured": true` in the response!

---

## 🐛 Troubleshooting

### "404 Not Found" with gsk_ key?
Your competition uses different endpoints. Contact:
- Competition organizers
- support@gradium.ai

### WebSocket timeout?
1. Try switching EU ↔ US endpoints
2. Check your firewall allows WebSocket (wss://)
3. Verify your API key is active

### "Invalid voice_id"?
- Competition keys might have different voice IDs
- Check competition docs for available voices

---

## 📚 Full Documentation

See `docs/GRADIUM_API_SETUP.md` for complete troubleshooting guide.

---

## ✅ What's Fixed

Your WebSocket implementation now has:
- ✅ Better error messages with helpful hints
- ✅ Proper language/voice configuration
- ✅ Automatic fallback from WebSocket → POST → Browser TTS
- ✅ Improved connection handling
- ✅ Speed optimization (0.95x for clarity)

---

## 🎯 Current Status

Your current `.env.local`:
- Key: `gsk_...` (competition key)
- Region: EU endpoints
- Method: WebSocket with POST fallback

**Next:** Just verify your key works with the EU endpoints, or switch to US if needed!
