#!/usr/bin/env python3
"""
Comprehensive QA Test Suite for OdysseyWalk
Tests all edge cases, error conditions, and integration points
"""

import json
import urllib.request
import urllib.error
import time
import sys
from typing import Dict, List, Tuple

BASE_URL = "http://localhost:3006"
RESULTS = {
    "passed": [],
    "failed": [],
    "warnings": [],
    "total": 0
}

def log_test(name: str, passed: bool, details: str = "", warning: bool = False):
    """Log test result"""
    RESULTS["total"] += 1
    status = "✅ PASS" if passed else ("⚠️  WARN" if warning else "❌ FAIL")
    print(f"{status}: {name}")
    if details:
        print(f"      {details}")
    
    if passed:
        RESULTS["passed"].append(name)
    elif warning:
        RESULTS["warnings"].append(f"{name}: {details}")
    else:
        RESULTS["failed"].append(f"{name}: {details}")

def make_request(method: str, path: str, data: dict = None, headers: dict = None, timeout: int = 30):
    """Make HTTP request"""
    url = f"{BASE_URL}{path}"
    req_headers = {"Content-Type": "application/json"}
    if headers:
        req_headers.update(headers)
    
    try:
        if method == "GET":
            req = urllib.request.Request(url, headers=req_headers)
        else:
            req = urllib.request.Request(
                url,
                data=json.dumps(data).encode() if data else None,
                headers=req_headers,
                method=method
            )
        
        with urllib.request.urlopen(req, timeout=timeout) as res:
            return res.status, json.loads(res.read())
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        try:
            return e.code, json.loads(body)
        except:
            return e.code, {"error": body}
    except Exception as e:
        return None, {"error": str(e)}

print("╔═══════════════════════════════════════════════════════════════════╗")
print("║     COMPREHENSIVE QA TEST SUITE - ODYSSEYWALK                    ║")
print("╚═══════════════════════════════════════════════════════════════════╝\n")

# ============================================================================
# PHASE 1: API HEALTH & CONFIGURATION
# ============================================================================
print("━━━ PHASE 1: API HEALTH & CONFIGURATION ━━━\n")

status, health = make_request("GET", "/api/health")
log_test("Health endpoint accessible", status == 200, f"Status: {status}")
log_test("Maps API configured", health.get("mapsKeyPresent") == True)
log_test("OpenRouter configured", health.get("openRouterConfigured") == True)
log_test("Gradium TTS configured", health.get("gradiumConfigured") == True)

# ============================================================================
# PHASE 2: TOUR GENERATION EDGE CASES
# ============================================================================
print("\n━━━ PHASE 2: TOUR GENERATION EDGE CASES ━━━\n")

# Test 2.1: Normal tour generation
status, tour = make_request("POST", "/api/tour/generate", {
    "start": {"lat": 37.7749, "lng": -122.4194, "label": "San Francisco"},
    "theme": "history",
    "durationMin": 30,
    "lang": "en",
    "voiceStyle": "friendly"
})
log_test("Normal tour generation", status == 200 and "sessionId" in tour)
if status == 200:
    log_test("Tour has POIs", 3 <= len(tour.get("pois", [])) <= 8)
    log_test("Tour has intro", len(tour.get("tourPlan", {}).get("intro", "")) > 50)
    log_test("Tour has distance", tour.get("tourPlan", {}).get("distanceMeters", 0) > 0)
    log_test("Tour has route points", len(tour.get("tourPlan", {}).get("routePoints", [])) >= 3)

# Test 2.2: Minimum duration (15 min)
status, tour = make_request("POST", "/api/tour/generate", {
    "start": {"lat": 40.7128, "lng": -74.0060, "label": "NYC"},
    "theme": "food",
    "durationMin": 15,
    "lang": "en"
})
log_test("Minimum duration (15min)", status == 200, f"POIs: {len(tour.get('pois', []))}" if status == 200 else "")

# Test 2.3: Maximum duration (90 min)
status, tour = make_request("POST", "/api/tour/generate", {
    "start": {"lat": 51.5074, "lng": -0.1278, "label": "London"},
    "theme": "art",
    "durationMin": 90,
    "lang": "en"
})
log_test("Maximum duration (90min)", status == 200, f"POIs: {len(tour.get('pois', []))}" if status == 200 else "")

# Test 2.4: Invalid coordinates (out of range)
status, resp = make_request("POST", "/api/tour/generate", {
    "start": {"lat": 999, "lng": -999, "label": "Invalid"},
    "theme": "history",
    "durationMin": 30
})
log_test("Invalid coordinates rejected", status in [400, 422, 500], f"Status: {status}")

# Test 2.5: Missing required fields
status, resp = make_request("POST", "/api/tour/generate", {
    "start": {"lat": 37.7749, "lng": -122.4194}
})
log_test("Missing fields rejected", status in [400, 422], f"Status: {status}")

# Test 2.6: Empty text/label
status, resp = make_request("POST", "/api/tour/generate", {
    "start": {"lat": 37.7749, "lng": -122.4194, "label": ""},
    "theme": "history",
    "durationMin": 30
})
log_test("Empty label handling", status in [200, 400, 422], f"Status: {status}")

# Test 2.7: All themes
themes = ["history", "food", "campus", "spooky", "art"]
for theme in themes:
    status, tour = make_request("POST", "/api/tour/generate", {
        "start": {"lat": 37.7749, "lng": -122.4194, "label": f"Test {theme}"},
        "theme": theme,
        "durationMin": 20
    })
    log_test(f"Theme '{theme}' works", status == 200, warning=(status != 200))

# Test 2.8: All languages
for lang in ["en", "fr"]:
    status, tour = make_request("POST", "/api/tour/generate", {
        "start": {"lat": 48.8566, "lng": 2.3522, "label": "Paris"},
        "theme": "history",
        "durationMin": 25,
        "lang": lang
    })
    log_test(f"Language '{lang}' works", status == 200, warning=(status != 200))

# Test 2.9: All voice styles
for voice in ["friendly", "historian", "funny"]:
    status, tour = make_request("POST", "/api/tour/generate", {
        "start": {"lat": 37.7749, "lng": -122.4194, "label": "SF"},
        "theme": "history",
        "durationMin": 25,
        "voiceStyle": voice
    })
    log_test(f"Voice style '{voice}' works", status == 200, warning=(status != 200))

# Test 2.10: Very long location name
status, tour = make_request("POST", "/api/tour/generate", {
    "start": {"lat": 37.7749, "lng": -122.4194, "label": "A" * 500},
    "theme": "history",
    "durationMin": 30
})
log_test("Very long location name", status == 200, warning=(status != 200))

# ============================================================================
# PHASE 3: TTS EDGE CASES
# ============================================================================
print("\n━━━ PHASE 3: TTS (GRADIUM) EDGE CASES ━━━\n")

# Test 3.1: Normal TTS
status, resp = make_request("POST", "/api/tts", {
    "text": "Hello, this is a test.",
    "lang": "en",
    "voiceStyle": "friendly",
    "returnBase64": True
})
log_test("Normal TTS generation", status == 200 and "audioBase64" in resp)

# Test 3.2: Empty text
status, resp = make_request("POST", "/api/tts", {
    "text": "",
    "lang": "en"
})
log_test("Empty text rejected", status in [400, 422])

# Test 3.3: Very long text (5000+ chars)
long_text = "Hello. " * 1000
status, resp = make_request("POST", "/api/tts", {
    "text": long_text,
    "lang": "en",
    "returnBase64": True
})
log_test("Very long text (truncated)", status == 200, warning=(status != 200))

# Test 3.4: Special characters
special_text = "Hello! @#$%^&*()_+-=[]{}|;':\",./<>?`~"
status, resp = make_request("POST", "/api/tts", {
    "text": special_text,
    "lang": "en",
    "returnBase64": True
})
log_test("Special characters handling", status == 200, warning=(status != 200))

# Test 3.5: Unicode/emoji
unicode_text = "Hello 🌍 World! Café résumé naïve"
status, resp = make_request("POST", "/api/tts", {
    "text": unicode_text,
    "lang": "en",
    "returnBase64": True
})
log_test("Unicode/emoji handling", status == 200, warning=(status != 200))

# Test 3.6: French language
status, resp = make_request("POST", "/api/tts", {
    "text": "Bonjour, comment allez-vous?",
    "lang": "fr",
    "voiceStyle": "friendly",
    "returnBase64": True
})
log_test("French TTS", status == 200, warning=(status != 200))

# Test 3.7: Missing text field
status, resp = make_request("POST", "/api/tts", {
    "lang": "en"
})
log_test("Missing text field rejected", status in [400, 422])

# Test 3.8: Invalid language
status, resp = make_request("POST", "/api/tts", {
    "text": "Hello",
    "lang": "invalid"
})
log_test("Invalid language handling", status in [200, 400, 422], warning=(status == 200))

# ============================================================================
# PHASE 4: VOICE Q&A EDGE CASES
# ============================================================================
print("\n━━━ PHASE 4: VOICE Q&A EDGE CASES ━━━\n")

# Generate a tour first for context
_, tour = make_request("POST", "/api/tour/generate", {
    "start": {"lat": 37.7749, "lng": -122.4194, "label": "SF"},
    "theme": "history",
    "durationMin": 25
})
session_id = tour.get("sessionId", "")
poi_id = tour.get("pois", [{}])[0].get("poiId", "") if tour.get("pois") else ""
poi_script = tour.get("pois", [{}])[0].get("script", "") if tour.get("pois") else ""

# Test 4.1: Normal Q&A
status, resp = make_request("POST", "/api/qa", {
    "sessionId": session_id,
    "poiId": poi_id,
    "questionText": "What makes this place special?",
    "context": {
        "currentPoiScript": poi_script,
        "tourIntro": tour.get("tourPlan", {}).get("intro", ""),
        "theme": "history"
    }
})
log_test("Normal Q&A", status == 200 and len(resp.get("answerText", "")) > 20)

# Test 4.2: Empty question
status, resp = make_request("POST", "/api/qa", {
    "sessionId": session_id,
    "poiId": poi_id,
    "questionText": "",
    "context": {}
})
log_test("Empty question handling", status in [200, 400, 422])

# Test 4.3: Very long question
long_q = "What is " + "very interesting about " * 50 + "this place?"
status, resp = make_request("POST", "/api/qa", {
    "sessionId": session_id,
    "poiId": poi_id,
    "questionText": long_q,
    "context": {"currentPoiScript": poi_script}
})
log_test("Very long question", status == 200, warning=(status != 200))

# Test 4.4: Missing context
status, resp = make_request("POST", "/api/qa", {
    "sessionId": session_id,
    "poiId": poi_id,
    "questionText": "Tell me more",
    "context": {}
})
log_test("Missing context (graceful)", status == 200, warning=(status != 200))

# Test 4.5: Invalid session ID
status, resp = make_request("POST", "/api/qa", {
    "sessionId": "invalid-session-12345",
    "poiId": poi_id,
    "questionText": "Test",
    "context": {}
})
log_test("Invalid session ID handling", status in [200, 400, 422], warning=(status == 200))

# Test 4.6: Special characters in question
status, resp = make_request("POST", "/api/qa", {
    "sessionId": session_id,
    "poiId": poi_id,
    "questionText": "What's @#$% special?",
    "context": {"currentPoiScript": poi_script}
})
log_test("Special characters in question", status == 200, warning=(status != 200))

# ============================================================================
# PHASE 5: RATE LIMITING
# ============================================================================
print("\n━━━ PHASE 5: RATE LIMITING ━━━\n")

# Test 5.1: Rapid requests (should hit rate limit)
print("      Testing rate limiting (30 requests)...")
rate_limited = False
for i in range(35):
    status, _ = make_request("POST", "/api/tts", {
        "text": f"Test {i}",
        "lang": "en",
        "returnBase64": True
    }, timeout=5)
    if status == 429:
        rate_limited = True
        break
    time.sleep(0.1)
log_test("Rate limiting active", rate_limited, f"Hit limit after {i+1} requests" if rate_limited else "No limit hit")

# ============================================================================
# PHASE 6: ERROR HANDLING
# ============================================================================
print("\n━━━ PHASE 6: ERROR HANDLING ━━━\n")

# Test 6.1: Invalid JSON
try:
    req = urllib.request.Request(
        f"{BASE_URL}/api/tour/generate",
        data=b"invalid json",
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req, timeout=5) as res:
        pass
except urllib.error.HTTPError as e:
    log_test("Invalid JSON rejected", e.code in [400, 422])
except:
    log_test("Invalid JSON rejected", True)

# Test 6.2: Wrong HTTP method
status, _ = make_request("GET", "/api/tts")
log_test("Wrong method rejected", status in [405, 400, 404])

# Test 6.3: Missing Content-Type
try:
    req = urllib.request.Request(
        f"{BASE_URL}/api/tour/generate",
        data=json.dumps({"start": {"lat": 37.7749, "lng": -122.4194}}).encode()
    )
    with urllib.request.urlopen(req, timeout=5) as res:
        status = res.status
except urllib.error.HTTPError as e:
    status = e.code
log_test("Missing Content-Type handling", status in [200, 400, 415], warning=(status == 200))

# ============================================================================
# PHASE 7: STATIC TOURS
# ============================================================================
print("\n━━━ PHASE 7: STATIC TOURS ━━━\n")

status, resp = make_request("GET", "/api/tours")
log_test("Static tours endpoint", status == 200)
if status == 200:
    tours = resp.get("tours", [])
    log_test("Static tours available", len(tours) > 0, f"Found {len(tours)} tours")
    
    if tours:
        tour_id = tours[0].get("tourId", "")
        status, tour_data = make_request("GET", f"/api/tours/{tour_id}")
        log_test("Get specific tour", status == 200 and "tour" in tour_data)

# Test invalid tour ID
status, _ = make_request("GET", "/api/tours/invalid-tour-id-12345")
log_test("Invalid tour ID handling", status in [404, 400])

# ============================================================================
# PHASE 8: PAGE ROUTES
# ============================================================================
print("\n━━━ PHASE 8: PAGE ROUTES ━━━\n")

routes = [
    ("/", "Landing page"),
    ("/create", "Create tour"),
    ("/demo", "Demo mode"),
    ("/tours", "Tour library"),
    ("/tour/active", "Active tour"),
    ("/tour/complete", "Completion"),
]

for route, name in routes:
    status, _ = make_request("GET", route)
    log_test(f"{name} accessible", status == 200, warning=(status != 200))

# ============================================================================
# FINAL REPORT
# ============================================================================
print("\n" + "═" * 70)
print("FINAL TEST REPORT")
print("═" * 70)
print(f"\nTotal Tests: {RESULTS['total']}")
print(f"✅ Passed: {len(RESULTS['passed'])}")
print(f"⚠️  Warnings: {len(RESULTS['warnings'])}")
print(f"❌ Failed: {len(RESULTS['failed'])}")
print(f"\nPass Rate: {(len(RESULTS['passed']) / RESULTS['total'] * 100):.1f}%")

if RESULTS['failed']:
    print("\n❌ FAILED TESTS:")
    for fail in RESULTS['failed']:
        print(f"   • {fail}")

if RESULTS['warnings']:
    print("\n⚠️  WARNINGS:")
    for warn in RESULTS['warnings'][:10]:  # Show first 10
        print(f"   • {warn}")

print("\n" + "═" * 70)

# Exit with error code if failures
sys.exit(0 if len(RESULTS['failed']) == 0 else 1)
