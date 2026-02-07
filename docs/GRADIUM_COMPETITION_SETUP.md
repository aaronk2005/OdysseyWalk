# Gradium API Setup for Competition

**Status:** ⚠️ API endpoints returning 404 errors  
**Your Key Format:** `gsk_...` (competition key)  
**Expected Format:** `gd_...` (standard Gradium key)

---

## Current Issue

Your Gradium API key (`gsk_...`) is not working with the standard Gradium endpoints. This could mean:

1. **Competition-specific endpoints**: The competition might use different API endpoints
2. **Key activation**: The key might need activation in a competition dashboard
3. **Different API structure**: Competition might have a different API structure

---

## What We've Tested

### Endpoint URLs Tested:
- ❌ `https://api.gradium.ai/api/speech/tts` - Connection failed
- ❌ `https://api.gradium.ai/postTTS` - Connection failed  
- ❌ `https://api.gradium.ai/tts` - Connection failed
- ❌ `https://api.gradium.ai/v1/tts` - Connection failed
- ❌ `https://eu.api.gradium.ai/api/speech/tts` - 404 Not Found
- ❌ `https://us.api.gradium.ai/api/speech/tts` - 404 Not Found

### Error Response:
```json
{"detail":"Not Found"}
```

---

## Next Steps to Get Gradium Working

### Option 1: Check Competition Documentation
1. Look for competition-specific API documentation
2. Check if there's a competition dashboard with endpoint URLs
3. Look for any competition Slack/Discord with API info
4. Check competition email/announcements for API details

### Option 2: Contact Gradium Support
**Email:** support@gradium.ai

**Include in your email:**
```
Subject: Competition API Key - Endpoint URLs Needed

Hi Gradium Team,

I have a competition API key (format: gsk_...) but I'm getting 404 errors 
on all standard endpoints. Could you please provide:

1. The correct TTS endpoint URL for competition keys
2. The correct STT endpoint URL for competition keys  
3. Any special authentication requirements

My key starts with: gsk_911eb7425c5de1b7213187a2b00fab1ba721bc566a518810e6d99ee4b669c92c

Thank you!
```

### Option 3: Check Competition Portal
1. Log into the competition portal/dashboard
2. Look for "API Documentation" or "Integration Guide"
3. Check for "Gradium API" section
4. Look for endpoint URLs specific to competition participants

---

## Current Configuration

Your `.env.local`:
```bash
GRADIUM_API_KEY=gsk_911eb7425c5de1b7213187a2b00fab1ba721bc566a518810e6d99ee4b669c92c
GRADIUM_TTS_URL=https://api.gradium.ai/api/speech/tts
GRADIUM_STT_URL=https://api.gradium.ai/api/speech/stt
```

**Once you have the correct endpoints, update:**
```bash
GRADIUM_TTS_URL=<correct-tts-endpoint-url>
GRADIUM_STT_URL=<correct-stt-endpoint-url>
```

---

## Code Status

✅ **Code is ready!** The TTS/STT endpoints are properly implemented:
- `/app/api/tts/route.ts` - Handles Gradium TTS API calls
- `/app/api/stt/route.ts` - Handles Gradium STT API calls
- Both use `Bearer ${apiKey}` authentication
- Both handle errors gracefully with fallbacks

**Once you have the correct endpoint URLs, just update `.env.local` and restart the server!**

---

## Fallback Behavior

**Current:** Browser TTS/STT fallbacks are active and working perfectly.

**For Competition:** You'll need Gradium working, but the fallbacks ensure your app works during development.

---

## Testing Once You Have Correct Endpoints

1. Update `.env.local` with correct URLs
2. Restart dev server: `npm run dev`
3. Test health: `curl http://localhost:3006/api/health`
4. Test TTS: 
   ```bash
   curl -X POST http://localhost:3006/api/tts \
     -H "Content-Type: application/json" \
     -d '{"text":"Hello","lang":"en","voiceStyle":"friendly","returnBase64":true}'
   ```
5. Test STT:
   ```bash
   curl -X POST http://localhost:3006/api/stt \
     -F "audio=@test.webm" \
     -F "lang=en"
   ```

---

## Competition Requirements Checklist

- [ ] Get correct Gradium TTS endpoint URL
- [ ] Get correct Gradium STT endpoint URL  
- [ ] Verify API key works with endpoints
- [ ] Test TTS generation
- [ ] Test STT transcription
- [ ] Verify integration in app
- [ ] Test full tour flow with Gradium

---

**Need Help?** Check competition documentation or contact Gradium support at support@gradium.ai
