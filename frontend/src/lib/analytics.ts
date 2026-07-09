import {
  getAttributionEventProperties,
  isAnalyticsDebugEnabled,
  shouldEnableBrowserAnalytics,
} from "./attribution";

type EventProperties = Record<string, string | number | boolean | null | undefined>;

declare global {
  interface Window {
    clarity?: (...args: unknown[]) => void;
  }
}

const POSTHOG_HOST = import.meta.env.VITE_POSTHOG_HOST;
const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY;
const CLARITY_PROJECT_ID = import.meta.env.VITE_CLARITY_PROJECT_ID;
const ANALYTICS_PROJECT = "baupilot-demo-erp-v2";

let analyticsInitialized = false;
let clarityInitialized = false;
let posthogReady = false;

function debugLog(message: string, details?: unknown) {
  if (!isAnalyticsDebugEnabled()) {
    return;
  }

  console.info("[analytics]", message, details ?? "");
}

function cleanProperties(properties: EventProperties) {
  return Object.fromEntries(
    Object.entries(properties).filter(([, value]) => value !== undefined)
  ) as EventProperties;
}

function getDeviceType() {
  const width = window.innerWidth;
  if (width < 768) {
    return "mobile";
  }

  if (width < 1280) {
    return "tablet";
  }

  return "desktop";
}

function ensureClarity() {
  if (
    clarityInitialized ||
    import.meta.env.MODE !== "production" ||
    !CLARITY_PROJECT_ID
  ) {
    return;
  }

  const clarityScriptId = "microsoft-clarity";
  if (document.getElementById(clarityScriptId)) {
    clarityInitialized = true;
    return;
  }

  (function initClarity(windowObject, documentObject, tagName, scriptUrl, projectId) {
    windowObject.clarity =
      windowObject.clarity ||
      function clarityProxy(...args: unknown[]) {
        (windowObject.clarity as { q?: unknown[][] }).q =
          (windowObject.clarity as { q?: unknown[][] }).q || [];
        (windowObject.clarity as { q?: unknown[][] }).q?.push(args);
      };

    const script = documentObject.createElement(tagName) as HTMLScriptElement;
    script.async = true;
    script.id = clarityScriptId;
    script.src = `${scriptUrl}${projectId}`;

    const firstScript = documentObject.getElementsByTagName(tagName)[0];
    firstScript?.parentNode?.insertBefore(script, firstScript);
  })(window, document, "script", "https://www.clarity.ms/tag/", CLARITY_PROJECT_ID);

  clarityInitialized = true;
  debugLog("Clarity initialized");
}

export function initAnalytics() {
  if (analyticsInitialized) {
    return;
  }

  analyticsInitialized = true;

  if (!shouldEnableBrowserAnalytics()) {
    debugLog("Analytics disabled on local host");
    return;
  }

  if (!POSTHOG_KEY || !POSTHOG_HOST) {
    debugLog("PostHog env vars missing");
    ensureClarity();
    return;
  }

  posthogReady = true;
  debugLog("PostHog direct capture enabled");
  ensureClarity();
}

function buildEventProperties(properties: EventProperties = {}) {
  return cleanProperties({
    analytics_project: ANALYTICS_PROJECT,
    analytics_surface: "demo",
    ...getAttributionEventProperties(),
    device_type: getDeviceType(),
    full_url: window.location.href,
    language: document.documentElement.lang || undefined,
    page_title: document.title || undefined,
    pathname: window.location.pathname,
    referrer: document.referrer || undefined,
    ...properties,
  });
}

export function track(eventName: string, properties: EventProperties = {}) {
  initAnalytics();
  const payload = buildEventProperties(properties);

  if (!shouldEnableBrowserAnalytics() || !POSTHOG_KEY || !POSTHOG_HOST || !posthogReady) {
    debugLog(`Skipped "${eventName}"`, payload);
    return;
  }

  const body = JSON.stringify({
    api_key: POSTHOG_KEY,
    event: eventName,
    properties: payload,
  });
  const captureUrl = `${POSTHOG_HOST.replace(/\/$/, "")}/capture/`;

  if (navigator.sendBeacon) {
    const sent = navigator.sendBeacon(
      captureUrl,
      new Blob([body], { type: "application/json" })
    );
    if (sent) {
      debugLog(`Tracked "${eventName}"`, payload);
      return;
    }
  }

  void fetch(captureUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
  }).catch((error) => debugLog(`Failed "${eventName}"`, error));
  debugLog(`Tracked "${eventName}"`, payload);
}

export function trackPageView(properties: EventProperties = {}) {
  track("page_view", properties);
}
