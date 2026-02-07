declare global {
  interface Window {
    __googleMapsLoaded?: Promise<void>;
    google?: typeof google;
    initGoogleMaps?: () => void;
  }
}

let loadPromise: Promise<void> | null = null;

/**
 * Load Google Maps JS API once. Avoids reloading script.
 * Rejects if apiKey is missing.
 */
export function loadGoogleMapsOnce(apiKey: string): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Google Maps can only load in browser"));
  }
  if (!apiKey || apiKey.trim() === "") {
    return Promise.reject(new Error("NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is not set"));
  }
  if (window.google?.maps) {
    return Promise.resolve();
  }
  if (window.__googleMapsLoaded) {
    return window.__googleMapsLoaded;
  }
  loadPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=initGoogleMaps`;
    script.async = true;
    script.defer = true;
    window.initGoogleMaps = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Google Maps script"));
    document.head.appendChild(script);
  });
  window.__googleMapsLoaded = loadPromise;
  return loadPromise;
}
