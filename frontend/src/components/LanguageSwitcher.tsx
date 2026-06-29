import { Languages } from "lucide-react";

import { useI18n } from "../hooks/useI18n";

export function LanguageSwitcher({ className = "" }: { className?: string }) {
  const { language, languages, setLanguage, t } = useI18n();

  return (
    <div className={`language-switcher ${className}`.trim()}>
      <span className="language-switcher-label">
        <Languages size={15} />
        {t("Sprache")}
      </span>
      <div className="language-switcher-buttons" role="group" aria-label={t("Sprache")}>
        {languages.map((item) => (
          <button
            className={language === item.code ? "is-active" : ""}
            key={item.code}
            onClick={() => setLanguage(item.code)}
            type="button"
          >
            {item.shortLabel}
          </button>
        ))}
      </div>
    </div>
  );
}
