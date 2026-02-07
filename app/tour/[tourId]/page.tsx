"use client";

import { useCallback, useState, useRef } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Settings } from "lucide-react";
import { MapView } from "@/components/MapView";
import { BottomSheetPlayer } from "@/components/BottomSheetPlayer";
import { SettingsDrawer } from "@/components/SettingsDrawer";
import { DebugPanel } from "@/components/DebugPanel";
import { Toast } from "@/components/Toast";
import { AskTextModal } from "@/components/AskTextModal";
import { DemoModeBanner } from "@/components/DemoModeBanner";
import { MapsKeyBanner } from "@/components/MapsKeyBanner";
import { useTourController } from "@/hooks/useTourController";
import { getClientConfig } from "@/lib/config";

export default function TourPage() {
  const params = useParams();
  const tourId = typeof params.tourId === "string" ? params.tourId : null;
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

  const clientConfig = getClientConfig();
  const {
    tour,
    pois,
    loading,
    error,
    userLocation,
    visitedPoiIds,
    activePoiId,
    currentPoi,
    nextPoiName,
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
    skipNext,
    replay,
    jumpToPoi,
    forceTriggerNext,
    askStart,
    askStop,
    narrationTextFallback,
    tryAudioAgain,
    showAskModal,
    setShowAskModal,
    submitAskText,
    fitRouteBounds,
    fitBoundsTrigger,
    clearAudioCache,
    audioStateLog,
  } = useTourController(tourId);

  const lastToastRef = useRef({ message: "", type: "" });
  const showToast = useCallback((message: string, type: "success" | "error" | "info" = "info") => {
    if (lastToastRef.current.message === message && lastToastRef.current.type === type) return;
    lastToastRef.current = { message, type };
    setToast({ message, type });
  }, []);

  if (!tourId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-white/60">Missing tour ID</p>
        <Link href="/tours" className="ml-2 text-accent-blue">Back to tours</Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-2 border-accent-blue border-t-transparent animate-spin" />
      </div>
    );
  }

  if (error || !tour) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 px-4 bg-navy-950">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 max-w-sm text-center">
          <p className="text-white/90 font-medium">Couldn’t load this tour</p>
          <p className="text-sm text-white/60 mt-1">{error || "Tour not found"}</p>
          <div className="flex flex-col gap-3 mt-6">
            <Link
              href="/tours"
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-medium"
            >
              Back to tours
            </Link>
            <Link
              href="/demo"
              className="px-4 py-2.5 rounded-xl bg-accent-blue/20 text-accent-blue border border-accent-blue/30 font-medium"
            >
              Try demo tour
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const center = userLocation || (pois[0] ? { lat: pois[0].lat, lng: pois[0].lng } : { lat: 37.78, lng: -122.41 });

  return (
    <div className="fixed inset-0 flex flex-col bg-navy-950">
      <header className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-navy-950/90 backdrop-blur z-20">
        <Link
          href="/tours"
          className="p-2 rounded-lg hover:bg-white/10 text-white"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="font-semibold text-white truncate flex-1 text-center mx-2">
          {tour.name}
        </h1>
        <button
          type="button"
          onClick={() => setSettingsOpen(true)}
          className="p-2 rounded-lg hover:bg-white/10 text-white"
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

      {demoMode && (
        <div className="px-4 pt-2 z-20">
          <DemoModeBanner onJumpNext={forceTriggerNext} />
        </div>
      )}

      <div className="flex-1 min-h-0 relative">
        {clientConfig.mapsKeyPresent ? (
          <MapView
            mapApiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!}
            center={center}
            routePoints={tour.routePoints}
            polyline={tour.polyline}
            pois={pois}
            userLocation={userLocation}
            visitedPoiIds={visitedPoiIds}
            activePoiId={activePoiId}
            onPoiClick={(id) => {
              jumpToPoi(id);
              showToast(`Playing ${pois.find((p) => p.poiId === id)?.name}`);
            }}
            followUser={followCamera}
            className="absolute inset-0 rounded-none"
            fitBoundsTrigger={fitBoundsTrigger}
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-navy-900 text-white/60 p-4">
            <p className="text-center">Map unavailable. Use the player below to play stops.</p>
            <p className="text-sm mt-2 text-white/40">Demo mode works without a map.</p>
          </div>
        )}
      </div>

      <BottomSheetPlayer
        tourName={tour.name}
        currentPoi={currentPoi}
        nextPoiName={nextPoiName}
        visitedCount={visitedPoiIds.length}
        totalCount={pois.length}
        audioState={audioState}
        isDemoMode={demoMode}
        onPlay={startTour}
        onPause={pause}
        onResume={resume}
        onSkipNext={skipNext}
        onReplay={replay}
        onAskStart={askStart}
        onAskStop={askStop}
        isAsking={isAsking}
        askState={askState}
        narrationTextFallback={narrationTextFallback}
        onTryAudioAgain={tryAudioAgain}
        onFitBounds={fitRouteBounds}
      />

      <DebugPanel
        pois={pois}
        visitedPoiIds={visitedPoiIds}
        onJumpToPoi={jumpToPoi}
        onForceTriggerNext={forceTriggerNext}
        onClearAudioCache={clearAudioCache}
        userLat={userLocation?.lat}
        userLng={userLocation?.lng}
        audioState={audioState}
        audioStateLog={audioStateLog}
      />

      <SettingsDrawer
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        demoMode={demoMode}
        onDemoModeChange={setDemoMode}
        voiceStyle={voiceStyle}
        onVoiceStyleChange={setVoiceStyle}
        lang={lang}
        onLangChange={setLang}
        followCamera={followCamera}
        onFollowCameraChange={setFollowCamera}
      />

      <AskTextModal
        open={showAskModal}
        onClose={() => setShowAskModal(false)}
        onSubmit={submitAskText}
      />

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          visible
          onDismiss={() => setToast(null)}
        />
      )}
    </div>
  );
}
