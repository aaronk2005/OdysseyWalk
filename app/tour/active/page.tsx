"use client";

import { useCallback, useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Settings } from "lucide-react";
import { MapView } from "@/components/MapView";
import { OdysseyLogo } from "@/components/OdysseyLogo";
import { PreWalkBriefingSheet } from "@/components/PreWalkBriefingSheet";
import { ActiveWalkAudioPanel } from "@/components/ActiveWalkAudioPanel";
import { VoiceBar } from "@/components/VoiceBar";
import { FirstTimeHint } from "@/components/FirstTimeHint";
import { AskTextModal } from "@/components/AskTextModal";
import { DemoModeBanner } from "@/components/DemoModeBanner";
import { MapsKeyBanner } from "@/components/MapsKeyBanner";
import { DebugPanel, type ApiStatus } from "@/components/DebugPanel";
import { SettingsDrawer } from "@/components/SettingsDrawer";
import { useToast } from "@/components/ToastProvider";
import { useActiveTour } from "@/hooks/useActiveTour";
import { useVoiceNext } from "@/hooks/useVoiceNext";
import { getClientConfig } from "@/lib/config";
import { startRecording, stopRecording, runVoiceQaLoop } from "@/lib/voice/VoiceController";
import { loadTour, updateSession } from "@/lib/data/SessionStore";
import { AudioSessionManager } from "@/lib/audio/AudioSessionManager";
import { AudioState } from "@/lib/types";
import { distanceMeters } from "@/lib/maps/haversine";

export default function TourActivePage() {
  const clientConfig = getClientConfig();
  const mapKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showAskModal, setShowAskModal] = useState(false);
  const [apiStatus, setApiStatus] = useState<ApiStatus | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const [fitBoundsTrigger, setFitBoundsTrigger] = useState(0);
  const [prevAudioState, setPrevAudioState] = useState<AudioState>(AudioState.IDLE);
  const toast = useToast();

  const {
    session,
    userLocation,
    audioState,
    askState,
    setAskState,
    introPlayed,
    startWalk,
    playPoi,
    jumpNext,
    pause,
    resume,
    replay,
    clearAudioCache,
    refreshSession,
    currentPoi,
    nextPoi,
  } = useActiveTour();

  // Voice next feature for hands-free navigation
  const {
    startVoiceNext,
    stopVoiceNext,
    isVoiceNextRecording,
    voiceNextError,
  } = useVoiceNext(jumpNext);

  // Trigger map fit to route when pre-walk screen is shown (map zooms to route)
  useEffect(() => {
    if (session && !introPlayed && session.tourPlan.routePoints?.length) {
      setFitBoundsTrigger((k) => k + 1);
    }
  }, [session?.sessionId, introPlayed]);

  // Track previous audio state to show "Resume" hint after answer
  useEffect(() => {
    setPrevAudioState(audioState);
  }, [audioState]);

  useEffect(() => {
    fetch("/api/health")
      .then((r) => r.json())
      .then((d) => setApiStatus({ mapsKeyPresent: d.mapsKeyPresent, openRouterConfigured: d.openRouterConfigured, gradiumConfigured: d.gradiumConfigured }))
      .catch(() => setApiStatus(null));
  }, []);

  const handleAskStart = useCallback(() => {
    setLastError(null);
    setAskState("listening");
    startRecording({
      onListeningEnd: () => setAskState("idle"),
      onThinking: () => setAskState("thinking"),
      onAnswerStart: () => setAskState("speaking"),
      onAnswerEnd: () => setAskState("idle"),
      onTypedQuestionFallback: () => setShowAskModal(true),
      onError: (err) => {
        setLastError(err);
        toast.showToast(err, "error");
      },
    });
  }, [setAskState, toast]);

  const handleAskStop = useCallback(() => {
    stopRecording();
  }, []);

  const handleTypedQuestion = useCallback(
    async (question: string) => {
      setShowAskModal(false);
      setLastError(null);
      setAskState("thinking");
      const s = loadTour();
      try {
        await runVoiceQaLoop(s, () => Promise.resolve(question), {
          onAnswerStart: () => setAskState("speaking"),
          onAnswerEnd: () => setAskState("idle"),
          onError: (err) => {
            setLastError(err);
            toast.showToast(err, "error");
          },
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Q&A failed";
        setLastError(msg);
        toast.showToast(msg, "error");
      }
    },
    [setAskState, toast]
  );

  const handleDemoModeChange = useCallback((demo: boolean) => {
    updateSession({ mode: demo ? "demo" : "real" });
    refreshSession();
  }, [refreshSession]);

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-app-bg">
        <div className="w-10 h-10 rounded-full border-2 border-brand-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  const center = userLocation ?? (session.pois[0] ? { lat: session.pois[0].lat, lng: session.pois[0].lng } : { lat: 37.78, lng: -122.41 });
  const themeName = session.tourPlan?.theme ?? "Tour";
  const tourLabel = themeName.charAt(0).toUpperCase() + themeName.slice(1) + " Walk";
  const distanceKm = session.tourPlan.distanceMeters != null ? session.tourPlan.distanceMeters / 1000 : undefined;
  const durationMin = session.tourPlan.estimatedMinutes ?? 0;

  // Next stop badge: distance from user to next POI
  const nextStopDistanceM =
    userLocation && nextPoi ? Math.round(distanceMeters(userLocation, { lat: nextPoi.lat, lng: nextPoi.lng })) : null;
  const nextStopBadgeText =
    nextPoi && nextStopDistanceM != null
      ? `${nextPoi.name} · ${nextStopDistanceM < 1000 ? `${nextStopDistanceM}m` : `${(nextStopDistanceM / 1000).toFixed(1)} km`}`
      : nextPoi
        ? `Next: ${nextPoi.name}`
        : null;

  // State-based overlay: dim map when narration/answer/listening so audio is the focus
  const isNarrating =
    audioState === AudioState.NARRATING ||
    audioState === AudioState.PLAYING_INTRO ||
    audioState === AudioState.PLAYING_OUTRO;
  const isAnswering = audioState === AudioState.ANSWERING;
  const isAsking = askState !== "idle";
  const showDimOverlay = isAsking || isAnswering;
  const showSoftDim = isNarrating && !showDimOverlay;
  
  // Show "Resume" hint if previous state was ANSWERING and now we're IDLE/NAVIGATING
  const showResumeHint = prevAudioState === AudioState.ANSWERING && !isAnswering && !isNarrating;

  return (
    <div className="fixed inset-0 flex flex-col bg-app-bg">
      {/* Minimal header: only show when walking (after intro) so pre-walk is immersive */}
      <header
        className={
          introPlayed
            ? "grid grid-cols-3 items-center px-3 py-2.5 border-b border-app-border bg-surface/95 backdrop-blur-sm z-20 safe-top shrink-0"
            : "absolute top-0 left-0 right-0 grid grid-cols-3 items-center px-3 py-2.5 z-20 safe-top"
        }
      >
        <Link
          href="/create"
          className="p-2.5 min-w-[44px] min-h-[44px] w-12 flex items-center justify-center rounded-full hover:bg-app-bg text-ink-primary transition-colors justify-self-start"
          aria-label="Back to create"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <Link href="/" className="min-h-[44px] flex items-center justify-center justify-self-center" aria-label="Odyssey Walk home">
          <OdysseyLogo size="sm" />
        </Link>
        <button
          type="button"
          onClick={() => setSettingsOpen(true)}
          className="p-2.5 min-w-[44px] min-h-[44px] w-12 flex items-center justify-center rounded-full hover:bg-app-bg text-ink-primary transition-colors justify-self-end"
          aria-label="Settings"
        >
          <Settings className="w-5 h-5" />
        </button>
      </header>

      {!clientConfig.mapsKeyPresent && (
        <div className="px-4 pt-2 z-20">
          <MapsKeyBanner />
        </div>
      )}
      {introPlayed && session.mode === "demo" && (
        <div className="px-4 pt-2 z-20 shrink-0">
          <DemoModeBanner onJumpNext={jumpNext} onRunScriptedDemo={() => {}} />
        </div>
      )}

      {/* ─── PRE-WALK BRIEFING: Top 60% map, bottom 40% anchored sheet ─── */}
      {!introPlayed && (
        <>
          <div className="absolute inset-0 flex flex-col" style={{ paddingTop: "max(env(safe-area-inset-top), 56px)" }}>
            <div className="h-[60vh] min-h-[240px] relative overflow-hidden shrink-0">
              {mapKey ? (
                <MapView
                  mapApiKey={mapKey}
                  center={center}
                  routePoints={session.tourPlan.routePoints}
                  pois={session.pois}
                  userLocation={null}
                  visitedPoiIds={[]}
                  activePoiId={session.pois[0]?.poiId ?? null}
                  onPoiClick={(id) => {
                    const poi = session.pois.find((p) => p.poiId === id);
                    if (poi) playPoi(poi);
                  }}
                  followUser={false}
                  fitBoundsTrigger={fitBoundsTrigger}
                  className="absolute inset-0 rounded-none"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center p-4 bg-surface-muted">
                  <p className="text-caption text-ink-secondary text-center">Map unavailable</p>
                </div>
              )}
            </div>
          </div>

          <PreWalkBriefingSheet
            tourTitle={tourLabel}
            durationMin={durationMin}
            stopCount={session.pois.length}
            distanceKm={distanceKm}
            introLine="You're about to start an audio-guided walk. Tap Start to hear the intro and begin."
            onStartWalk={startWalk}
          />
        </>
      )}

      {/* ─── ACTIVE WALK: 3 zones (Map ~45% | Audio Panel | Voice Bar) ─── */}
      {introPlayed && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="flex flex-col flex-1"
        >
          {/* Zone 1: Navigation map (~45%) */}
          <div className="relative shrink-0 h-[45vh] min-h-[200px] overflow-hidden">
            {mapKey ? (
              <MapView
                mapApiKey={mapKey}
                center={center}
                routePoints={session.tourPlan.routePoints}
                pois={session.pois}
                userLocation={userLocation}
                visitedPoiIds={session.visitedPoiIds}
                activePoiId={session.activePoiId}
                onPoiClick={(id) => {
                  const poi = session.pois.find((p) => p.poiId === id);
                  if (poi) playPoi(poi);
                }}
                followUser={session.mode === "demo" || Boolean(userLocation)}
                navigationMode
                className="absolute inset-0 rounded-none"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center p-4 bg-surface-muted">
                <p className="text-caption text-ink-secondary text-center">Map unavailable</p>
              </div>
            )}

            {/* State overlay: dim when asking or answer playing */}
            <AnimatePresence>
              {showDimOverlay && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-black/40 pointer-events-none z-10"
                  aria-hidden
                />
              )}
              {showSoftDim && !showDimOverlay && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-black/15 pointer-events-none z-10"
                  aria-hidden
                />
              )}
            </AnimatePresence>

            {/* Floating badge: Next stop · distance (with backdrop blur + shadow polish) */}
            {nextStopBadgeText && (
              <div className="absolute bottom-3 left-4 right-4 z-10">
                <div className="inline-flex px-3 py-2 rounded-xl bg-surface/95 shadow-lg border border-app-border/60 backdrop-blur-md">
                  <span className="text-xs font-semibold text-ink-primary truncate">Next: {nextStopBadgeText}</span>
                </div>
              </div>
            )}
          </div>

          {/* Zone 2: Audio panel (Spotify-like) */}
          <div className="shrink-0 pt-3">
            <ActiveWalkAudioPanel
              currentStopName={currentPoi?.name ?? "Intro"}
              stopIndex={session.visitedPoiIds.length}
              totalStops={session.pois.length}
              audioState={audioState}
              isAnswerPlaying={isAnswering}
              onPlayPause={() => (audioState === AudioState.NARRATING || audioState === AudioState.PLAYING_INTRO || audioState === AudioState.PLAYING_OUTRO || audioState === AudioState.ANSWERING ? pause() : resume())}
              onSkip={jumpNext}
              onReplay={replay}
              isDemoMode={session.mode === "demo"}
              showResumeHint={showResumeHint}
            />
          </div>

          {/* Zone 3: Voice bar — mic is the hero */}
          <div className="flex-1 min-h-0 flex flex-col justify-end relative">
            <VoiceBar askState={askState} onAskStart={handleAskStart} onAskStop={handleAskStop} />
            {/* First-time hint: shows once */}
            <FirstTimeHint
              storageKey="odyssey-hint-mic"
              message="Hold the mic to ask questions about this place"
              position="bottom"
            />
          </div>
        </motion.div>
      )}

      <AskTextModal open={showAskModal} onClose={() => setShowAskModal(false)} onSubmit={handleTypedQuestion} />

      <SettingsDrawer
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        demoMode={session.mode === "demo"}
        onDemoModeChange={handleDemoModeChange}
        voiceStyle="friendly"
        onVoiceStyleChange={(v) => AudioSessionManager.setOptions({ voiceStyle: v })}
        lang="en"
        onLangChange={(l) => AudioSessionManager.setOptions({ lang: l })}
      />

      {introPlayed && (
        <DebugPanel
          pois={session.pois}
          visitedPoiIds={session.visitedPoiIds}
          onJumpToPoi={(poiId) => {
            const p = session.pois.find((x) => x.poiId === poiId);
            if (p) playPoi(p);
          }}
          onForceTriggerNext={jumpNext}
          onClearAudioCache={clearAudioCache}
          userLat={userLocation?.lat}
          userLng={userLocation?.lng}
          audioState={audioState}
          apiStatus={apiStatus}
          lastError={lastError}
        />
      )}
    </div>
  );
}
