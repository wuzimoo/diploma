import { ReactNode, useEffect } from "react";
import { useLocation } from "react-router-dom";

import { useI18n } from "../hooks/useI18n";
import { captureAttributionFromWindow } from "../lib/attribution";
import { initAnalytics, track, trackPageView } from "../lib/analytics";

export function AnalyticsProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const { language } = useI18n();

  useEffect(() => {
    initAnalytics();
  }, []);

  useEffect(() => {
    captureAttributionFromWindow();

    const routePath = `${location.pathname}${location.search}${location.hash}`;
    trackPageView({
      language,
      route_path: routePath,
    });

    const demoOpenedKey = "demo-opened";
    if (!window.sessionStorage.getItem(demoOpenedKey)) {
      track("demo_opened", {
        entry_path: routePath,
        language,
      });
      window.sessionStorage.setItem(demoOpenedKey, "1");
    }
  }, [language, location.hash, location.pathname, location.search]);

  return <>{children}</>;
}
