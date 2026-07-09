export const ATTRIBUTION_STORAGE_KEY = "baupilot-attribution";

export type AttributionData = {
  campaign_name?: string;
  company_slug?: string;
  company_tier?: string;
  first_seen_at?: string;
  landing_path?: string;
  qr_company?: string;
  referrer?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_medium?: string;
  utm_source?: string;
  utm_term?: string;
};

function readEnvFlag(value: string | undefined) {
  return value === "1" || value === "true";
}

function cleanValue(value: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function cleanObject<T extends Record<string, unknown>>(value: T) {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined && entry !== "")
  ) as T;
}

export function isAnalyticsDebugEnabled() {
  return readEnvFlag(import.meta.env.VITE_ANALYTICS_DEBUG);
}

export function isLocalDevelopmentHost(hostname?: string) {
  if (!hostname) {
    return false;
  }

  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "[::1]" ||
    hostname.endsWith(".local")
  );
}

export function shouldEnableBrowserAnalytics() {
  return !isLocalDevelopmentHost(window.location.hostname) || isAnalyticsDebugEnabled();
}

export function getStoredAttribution(): AttributionData {
  const stored = window.localStorage.getItem(ATTRIBUTION_STORAGE_KEY);
  if (!stored) {
    return {};
  }

  try {
    return JSON.parse(stored) as AttributionData;
  } catch {
    return {};
  }
}

export function persistAttribution(attribution: AttributionData) {
  window.localStorage.setItem(
    ATTRIBUTION_STORAGE_KEY,
    JSON.stringify(cleanObject(attribution))
  );

  return attribution;
}

export function captureAttributionFromWindow() {
  const current = getStoredAttribution();
  const params = new URLSearchParams(window.location.search);
  const incoming = cleanObject<AttributionData>({
    campaign_name:
      cleanValue(params.get("campaign_name")) ??
      cleanValue(params.get("utm_campaign")),
    company_slug:
      cleanValue(params.get("company")) ?? cleanValue(params.get("company_slug")),
    company_tier: cleanValue(params.get("company_tier")),
    first_seen_at: current.first_seen_at ?? new Date().toISOString(),
    landing_path: current.landing_path ?? window.location.pathname,
    qr_company:
      cleanValue(params.get("company")) ??
      cleanValue(params.get("company_slug")) ??
      cleanValue(params.get("utm_content")),
    referrer: current.referrer ?? cleanValue(document.referrer),
    utm_campaign: cleanValue(params.get("utm_campaign")) ?? current.utm_campaign,
    utm_content: cleanValue(params.get("utm_content")) ?? current.utm_content,
    utm_medium: cleanValue(params.get("utm_medium")) ?? current.utm_medium,
    utm_source: cleanValue(params.get("utm_source")) ?? current.utm_source,
    utm_term: cleanValue(params.get("utm_term")) ?? current.utm_term,
  });

  return persistAttribution({ ...current, ...incoming });
}

export function getAttributionEventProperties() {
  const attribution = getStoredAttribution();

  return cleanObject({
    campaign_name: attribution.campaign_name,
    company_slug: attribution.company_slug,
    company_tier: attribution.company_tier,
    first_seen_at: attribution.first_seen_at,
    first_touch_campaign: attribution.utm_campaign,
    first_touch_source: attribution.utm_source,
    landing_path: attribution.landing_path,
    qr_company: attribution.qr_company,
    utm_campaign: attribution.utm_campaign,
    utm_content: attribution.utm_content,
    utm_medium: attribution.utm_medium,
    utm_source: attribution.utm_source,
    utm_term: attribution.utm_term,
  });
}
