"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { getTour } from "@/lib/data/TourRepository";
import { loadSettings, saveSettings } from "@/lib/settings";
import { GeoProvider } from "@/lib/geo/GeoProvider";
import { GeoSimProvider } from "@/lib/geo/GeoSimProvider";
import { createTriggerEngine } from "@/lib/geo/GeoTriggerEngine";
import { AudioSessionManager } from "@/lib/audio/AudioSessionManager";
import { STTRecorder } from "@/lib/voice/STTRecorder";
import type { Tour, POI, LatLng, VoiceStyle, Lang } from "@/lib/types";
import { AudioState } from "@/lib/types";

const geoReal = new GeoProvider();
const geoSim = new GeoSimProvider();
const sttRecorder = new STTRecorder();

export function useTourController(tourId: string | null) {
  const [tour, setTour] = useState<Tour | null>(null);
  const [pois, setPois] = useState<POI[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [userLocation, setUserLocation] = useState<LatLng | null>(null);
  const [visitedPoiIds, setVisitedPoiIds] = useState<string[]>([]);
  const [activePoiId, setActivePoiId] = useState<string | null>(null);
  const [demoMode, setDemoMode] = useState(true);
  const [voiceStyle, setVoiceStyle] = useState<VoiceStyle>("friendly");
  const [lang, setLang] = useState<Lang>("en");
  const [followCamera, setFollowCamera] = useState(true);
  const [audioState, setAudioState] = useState<AudioState>(AudioState.IDLE);
  const [askState, setAskState] = useState<"idle" | "listening" | "thinking" | "speaking">("idle");
  const [isAsking, setIsAsking] = useState(false);
  const [narrationTextFallback, setNarrationTextFallback] = useState<string | null>(null);
  const [activePoiIdForFallback, setActivePoiIdForFallback] = useState<string | null>(null);
  const [showAskModal, setShowAskModal] = useState(false);
  const [fitBoundsTrigger, setFitBoundsTrigger] = useState(0);

  const providerRef = useRef<typeof geoReal | typeof geoSim>(geoSim);
  const triggerCheckRef = useRef<((loc: { lat: number; lng: number; timestamp: number }) => { type: string; poiId: string } | null) | null>(null);

  useEffect(() => {
    if (!tourId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    getTour(tourId)
      .then(({ tour: t, pois: p }) => {
        setTour(t);
        setPois(p);
        setVisitedPoiIds([]);
        setActivePoiId(null);
        const points = t.routePoints || [];
        geoSim.setRoute(points);
        geoSim.setPoiPositions(p.map((poi) => ({ poiId: poi.poiId, lat: poi.lat, lng: poi.lng })));
        if (points.length > 0) {
          setUserLocation({ lat: points[0].lat, lng: points[0].lng });
          geoSim.start();
        }
        triggerCheckRef.current = createTriggerEngine(p, []);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load tour"))
      .finally(() => setLoading(false));
  }, [tourId]);

  const settingsHydrated = useRef(false);
  useEffect(() => {
    if (settingsHydrated.current) return;
    settingsHydrated.current = true;
    const s = loadSettings();
    setDemoMode(s.demoMode);
    setVoiceStyle(s.voiceStyle);
    setLang(s.lang);
    setFollowCamera(s.followCamera);
  }, []);

  useEffect(() => {
    providerRef.current = demoMode ? geoSim : geoReal;
    if (demoMode) {
      geoReal.stop();
      geoSim.start();
      const first = tour?.routePoints?.[0] || pois[0];
      if (first) setUserLocation("lat" in first ? first : { lat: pois[0].lat, lng: pois[0].lng });
    } else {
      geoSim.stop();
      geoReal.start();
    }
  }, [demoMode, tour, pois]);

  useEffect(() => {
    triggerCheckRef.current = createTriggerEngine(pois, visitedPoiIds);
  }, [pois, visitedPoiIds]);

  useEffect(() => {
    const unsubGeo = providerRef.current.subscribe((update) => {
      setUserLocation({ lat: update.lat, lng: update.lng });
      const check = triggerCheckRef.current;
      if (check) {
        const ev = check(update);
        if (ev) {
          setVisitedPoiIds((prev) =>
            prev.includes(ev.poiId) ? prev : [...prev, ev.poiId]
          );
          setActivePoiId(ev.poiId);
          const poi = pois.find((p) => p.poiId === ev.poiId);
          const text =
            poi?.scripts?.[voiceStyle] ||
            poi?.scripts?.friendly ||
            poi?.scripts?.historian ||
            "";
          if (text) {
            AudioSessionManager.playNarration(ev.poiId, text, {
              voiceStyle,
              lang,
              scriptVersion: poi?.scriptVersion ?? 1,
            }).then((r) => {
              if (!r.played && r.textFallback) {
                setNarrationTextFallback(r.textFallback);
                setActivePoiIdForFallback(ev.poiId);
              } else {
                setNarrationTextFallback(null);
                setActivePoiIdForFallback(null);
              }
            });
          }
        }
      }
    });
    return () => unsubGeo();
  }, [pois, voiceStyle, lang]);

  useEffect(() => {
    saveSettings({ demoMode, voiceStyle, lang, followCamera });
  }, [demoMode, voiceStyle, lang, followCamera]);

  const [audioStateLog, setAudioStateLog] = useState<string[]>([]);
  useEffect(() => {
    AudioSessionManager.setTransitionLog((from, to) => {
      const line = `${from} → ${to}`;
      setAudioStateLog((prev) => [...prev.slice(-9), line]);
    });
    return () => AudioSessionManager.setTransitionLog(null);
  }, []);

  useEffect(() => {
    const unsub = AudioSessionManager.subscribe(setAudioState);
    return () => unsub();
  }, []);

  const playNarrationForPoi = useCallback(
    async (poiId: string) => {
      const poi = pois.find((p) => p.poiId === poiId);
      const text =
        poi?.scripts?.[voiceStyle] ||
        poi?.scripts?.friendly ||
        poi?.scripts?.historian ||
        "";
      setActivePoiId(poiId);
      setVisitedPoiIds((prev) =>
        prev.includes(poiId) ? prev : [...prev, poiId]
      );
      if (text) {
        const r = await AudioSessionManager.playNarration(poiId, text, {
          voiceStyle,
          lang,
          scriptVersion: poi?.scriptVersion ?? 1,
        });
        if (!r.played && r.textFallback) {
          setNarrationTextFallback(r.textFallback);
          setActivePoiIdForFallback(poiId);
        } else {
          setNarrationTextFallback(null);
          setActivePoiIdForFallback(null);
        }
      }
    },
    [pois, voiceStyle, lang]
  );

  const startTour = useCallback(() => {
    const next = pois.find((p) => !visitedPoiIds.includes(p.poiId));
    if (next) playNarrationForPoi(next.poiId);
  }, [pois, visitedPoiIds, playNarrationForPoi]);

  const pause = useCallback(() => AudioSessionManager.pause(), []);
  const resume = useCallback(() => AudioSessionManager.resume(), []);
  const stop = useCallback(() => AudioSessionManager.stop(), []);

  const skipNext = useCallback(() => {
    const next = pois.find((p) => !visitedPoiIds.includes(p.poiId));
    if (next) playNarrationForPoi(next.poiId);
  }, [pois, visitedPoiIds, playNarrationForPoi]);

  const replay = useCallback(() => {
    if (activePoiId) playNarrationForPoi(activePoiId);
  }, [activePoiId, playNarrationForPoi]);

  const jumpToPoi = useCallback(
    (poiId: string) => {
      geoSim.jumpToPoi(poiId);
      const poi = pois.find((p) => p.poiId === poiId);
      if (poi) setUserLocation({ lat: poi.lat, lng: poi.lng });
      playNarrationForPoi(poiId);
    },
    [pois, playNarrationForPoi]
  );

  const forceTriggerNext = useCallback(() => {
    const next = pois.find((p) => !visitedPoiIds.includes(p.poiId));
    if (next) playNarrationForPoi(next.poiId);
  }, [pois, visitedPoiIds, playNarrationForPoi]);

  const askStart = useCallback(() => {
    setIsAsking(true);
    setAskState("listening");
    AudioSessionManager.interruptForListening().then(() => {
      sttRecorder.setCallbacks({
        onStart: () => setAskState("listening"),
        onStop: () => {},
        onTranscript: async (transcript) => {
          if (!transcript?.trim()) {
            setAskState("idle");
            setIsAsking(false);
            return;
          }
          setAskState("thinking");
          try {
            const poi = pois.find((p) => p.poiId === activePoiId) || pois[0];
            const res = await fetch("/api/qa", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                tourId: tour?.tourId,
                poiId: activePoiId || poi?.poiId,
                question: transcript,
                voiceStyle,
                lang,
                poiScript: poi?.scripts?.[voiceStyle] || poi?.scripts?.friendly,
                poiFacts: poi?.facts,
              }),
            });
            const data = await res.json();
            const answerText = data.answerText || "I couldn't get an answer.";
            setAskState("speaking");
            await AudioSessionManager.playAnswerStream(answerText);
          } catch {
            setAskState("idle");
          }
          setIsAsking(false);
          setAskState("idle");
        },
        onError: () => {
          setAskState("idle");
          setIsAsking(false);
          setShowAskModal(true);
        },
      });
      sttRecorder.start();
    });
  }, [activePoiId, pois, tour, voiceStyle, lang]);

  const askStop = useCallback(() => {
    sttRecorder.stop();
  }, []);

  const tryAudioAgain = useCallback(() => {
    if (activePoiIdForFallback) playNarrationForPoi(activePoiIdForFallback);
    setNarrationTextFallback(null);
    setActivePoiIdForFallback(null);
  }, [activePoiIdForFallback, playNarrationForPoi]);

  const submitAskText = useCallback(
    async (question: string) => {
      setShowAskModal(false);
      setAskState("thinking");
      try {
        const poi = pois.find((p) => p.poiId === activePoiId) || pois[0];
        const res = await fetch("/api/qa", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tourId: tour?.tourId,
            poiId: activePoiId || poi?.poiId,
            question,
            voiceStyle,
            lang,
            poiScript: poi?.scripts?.[voiceStyle] || poi?.scripts?.friendly,
            poiFacts: poi?.facts,
          }),
        });
        const data = await res.json();
        const answerText = data.answerText || "I couldn't get an answer.";
        setAskState("speaking");
        await AudioSessionManager.playAnswerStream(answerText);
      } catch {
        // keep idle
      }
      setAskState("idle");
    },
    [activePoiId, pois, tour, voiceStyle, lang]
  );

  const nextPoi = pois.find((p) => !visitedPoiIds.includes(p.poiId));
  const nextPoiId = nextPoi?.poiId ?? null;
  const currentPoi = activePoiId ? pois.find((p) => p.poiId === activePoiId) ?? null : null;

  const fitRouteBounds = useCallback(() => {
    setFitBoundsTrigger((t) => t + 1);
  }, []);

  return {
    tour,
    pois,
    loading,
    error,
    userLocation,
    visitedPoiIds,
    activePoiId,
    nextPoiId,
    currentPoi,
    nextPoiName: nextPoi?.name ?? null,
    demoMode,
    setDemoMode,
    voiceStyle,
    setVoiceStyle,
    lang,
    setLang,
    followCamera,
    setFollowCamera,
    audioState,
    askState,
    isAsking,
    startTour,
    pause,
    resume,
    stop,
    skipNext,
    replay,
    playNarrationForPoi,
    jumpToPoi,
    forceTriggerNext,
    askStart,
    askStop,
    stepForward: () => geoSim.stepForward(),
    narrationTextFallback,
    tryAudioAgain,
    showAskModal,
    setShowAskModal,
    submitAskText,
    fitRouteBounds,
    fitBoundsTrigger,
    clearAudioCache: () => AudioSessionManager.clearAudioCache(),
    audioStateLog,
  };
}
