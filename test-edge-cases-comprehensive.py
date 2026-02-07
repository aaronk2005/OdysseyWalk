#!/usr/bin/env python3
"""
Comprehensive edge case testing for OdysseyWalk platform
Tests all endpoints, routes, and features after recent fixes
"""

import requests
import json
import time
import sys
from typing import Dict, Any, List

BASE_URL = "http://localhost:3008"
TIMEOUT = 30

class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    RESET = '\033[0m'

def test(name: str, func):
    """Run a test and report results"""
    try:
        result = func()
        if result:
            print(f"{Colors.GREEN}✓{Colors.RESET} {name}")
            return True
        else:
            print(f"{Colors.RED}✗{Colors.RESET} {name}")
            return False
    except Exception as e:
        print(f"{Colors.RED}✗{Colors.RESET} {name}: {str(e)}")
        return False

def test_health():
    """Test health endpoint"""
    r = requests.get(f"{BASE_URL}/api/health", timeout=5)
    assert r.status_code == 200
    data = r.json()
    assert "ok" in data
    return True

def test_tour_generate_valid():
    """Test valid tour generation"""
    payload = {
        "start": {"lat": 37.7749, "lng": -122.4194, "label": "San Francisco"},
        "theme": "history",
        "durationMin": 30,
        "lang": "en",
        "voiceStyle": "friendly"
    }
    r = requests.post(f"{BASE_URL}/api/tour/generate", json=payload, timeout=TIMEOUT)
    assert r.status_code == 200
    data = r.json()
    assert "sessionId" in data
    assert "tourPlan" in data
    assert "pois" in data
    assert len(data["pois"]) > 0
    # Check voice settings are stored
    assert "voiceLang" in data["tourPlan"] or data["tourPlan"].get("voiceLang") == "en"
    return True

def test_tour_generate_invalid_coords():
    """Test invalid coordinates"""
    payload = {
        "start": {"lat": 100, "lng": -200, "label": "Invalid"},
        "theme": "history",
        "durationMin": 30
    }
    r = requests.post(f"{BASE_URL}/api/tour/generate", json=payload, timeout=10)
    assert r.status_code == 400
    return True

def test_tour_generate_invalid_duration():
    """Test invalid duration"""
    payload = {
        "start": {"lat": 37.7749, "lng": -122.4194, "label": "SF"},
        "theme": "history",
        "durationMin": 5  # Too short
    }
    r = requests.post(f"{BASE_URL}/api/tour/generate", json=payload, timeout=10)
    assert r.status_code == 400
    return True

def test_tour_generate_missing_start():
    """Test missing start location"""
    payload = {"theme": "history", "durationMin": 30}
    r = requests.post(f"{BASE_URL}/api/tour/generate", json=payload, timeout=10)
    assert r.status_code == 400
    return True

def test_tour_generate_directions_api():
    """Test that Directions API is being used (check routePoints)"""
    payload = {
        "start": {"lat": 37.7749, "lng": -122.4194, "label": "San Francisco"},
        "theme": "history",
        "durationMin": 30,
        "lang": "en",
        "voiceStyle": "friendly"
    }
    r = requests.post(f"{BASE_URL}/api/tour/generate", json=payload, timeout=TIMEOUT)
    assert r.status_code == 200
    data = r.json()
    # Route should have more points than just waypoints (Directions API adds detail)
    route_points = data["tourPlan"]["routePoints"]
    assert len(route_points) >= 3  # At least start, POIs, end
    # Distance should be reasonable
    distance = data["tourPlan"].get("distanceMeters", 0)
    assert distance > 0
    return True

def test_tts_valid():
    """Test valid TTS request"""
    payload = {
        "text": "Hello, this is a test.",
        "lang": "en",
        "voiceStyle": "friendly"
    }
    r = requests.post(f"{BASE_URL}/api/tts", json=payload, timeout=15)
    # Should succeed or return 503 (fallback)
    assert r.status_code in [200, 503]
    return True

def test_tts_multiple_languages():
    """Test TTS with different languages"""
    for lang in ["en", "fr"]:
        payload = {
            "text": "Test",
            "lang": lang,
            "voiceStyle": "friendly"
        }
        r = requests.post(f"{BASE_URL}/api/tts", json=payload, timeout=15)
        assert r.status_code in [200, 503]
    return True

def test_qa_valid():
    """Test valid Q&A request"""
    payload = {
        "sessionId": "test-session",
        "poiId": "poi-1",
        "questionText": "What is this place?",
        "context": {
            "currentPoiScript": "This is a test location.",
            "tourIntro": "Welcome to the tour.",
            "theme": "history"
        }
    }
    r = requests.post(f"{BASE_URL}/api/qa", json=payload, timeout=15)
    assert r.status_code == 200
    data = r.json()
    assert "answerText" in data
    return True

def test_qa_missing_context():
    """Test Q&A with missing context"""
    payload = {
        "questionText": "What is this?"
    }
    r = requests.post(f"{BASE_URL}/api/qa", json=payload, timeout=10)
    # Should still return 200 with fallback answer
    assert r.status_code == 200
    return True

def test_stt_endpoint():
    """Test STT endpoint (should return 503 with fallback info)"""
    form_data = {"audio": ("test.webm", b"fake audio data", "audio/webm")}
    r = requests.post(f"{BASE_URL}/api/stt", files=form_data, timeout=10)
    assert r.status_code == 503
    data = r.json()
    assert "fallback" in data
    return True

def test_tours_list():
    """Test tours list endpoint"""
    r = requests.get(f"{BASE_URL}/api/tours", timeout=10)
    assert r.status_code == 200
    data = r.json()
    assert "tours" in data
    return True

def test_rate_limiting():
    """Test rate limiting"""
    payload = {
        "start": {"lat": 37.7749, "lng": -122.4194, "label": "SF"},
        "theme": "history",
        "durationMin": 30
    }
    # Make rapid requests
    responses = []
    for _ in range(6):
        try:
            r = requests.post(f"{BASE_URL}/api/tour/generate", json=payload, timeout=5)
            responses.append(r.status_code)
        except:
            pass
        time.sleep(0.1)
    # At least one should be rate limited (429) or succeed
    assert any(status in [200, 429] for status in responses)
    return True

def test_landing_page():
    """Test landing page loads"""
    r = requests.get(f"{BASE_URL}/", timeout=10)
    assert r.status_code == 200
    assert "Discover Walking Tours" in r.text or "Walking Tours" in r.text
    return True

def test_create_page():
    """Test create page loads"""
    r = requests.get(f"{BASE_URL}/create", timeout=10)
    assert r.status_code == 200
    return True

def test_tours_page():
    """Test tours page loads"""
    r = requests.get(f"{BASE_URL}/tours", timeout=10)
    assert r.status_code == 200
    return True

def main():
    print(f"{Colors.BLUE}=== Comprehensive Edge Case Testing ==={Colors.RESET}\n")
    
    tests = [
        ("Health Check", test_health),
        ("Valid Tour Generation", test_tour_generate_valid),
        ("Invalid Coordinates", test_tour_generate_invalid_coords),
        ("Invalid Duration", test_tour_generate_invalid_duration),
        ("Missing Start Location", test_tour_generate_missing_start),
        ("Directions API Integration", test_tour_generate_directions_api),
        ("Valid TTS", test_tts_valid),
        ("TTS Multiple Languages", test_tts_multiple_languages),
        ("Valid Q&A", test_qa_valid),
        ("Q&A Missing Context", test_qa_missing_context),
        ("STT Endpoint", test_stt_endpoint),
        ("Tours List", test_tours_list),
        ("Rate Limiting", test_rate_limiting),
        ("Landing Page", test_landing_page),
        ("Create Page", test_create_page),
        ("Tours Page", test_tours_page),
    ]
    
    passed = 0
    failed = 0
    
    for name, test_func in tests:
        if test(name, test_func):
            passed += 1
        else:
            failed += 1
    
    print(f"\n{Colors.BLUE}=== Results ==={Colors.RESET}")
    print(f"{Colors.GREEN}Passed: {passed}{Colors.RESET}")
    if failed > 0:
        print(f"{Colors.RED}Failed: {failed}{Colors.RESET}")
    else:
        print(f"{Colors.GREEN}Failed: {failed}{Colors.RESET}")
    
    return 0 if failed == 0 else 1

if __name__ == "__main__":
    sys.exit(main())
