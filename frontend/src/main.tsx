import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import { AnalyticsProvider } from "./components/AnalyticsProvider";
import { AuthProvider } from "./hooks/useAuth";
import { LanguageProvider } from "./hooks/useI18n";
import { ToastProvider } from "./hooks/useToast";
import { AppRouter } from "./router/AppRouter";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <LanguageProvider>
        <AnalyticsProvider>
          <AuthProvider>
            <ToastProvider>
              <AppRouter />
            </ToastProvider>
          </AuthProvider>
        </AnalyticsProvider>
      </LanguageProvider>
    </BrowserRouter>
  </React.StrictMode>
);
