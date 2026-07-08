let locale = "de-DE";
const plainDatePattern = /^\d{4}-\d{2}-\d{2}$/;

function asDate(value: Date | string) {
  if (value instanceof Date) return value;
  if (plainDatePattern.test(value)) {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year, month - 1, day);
  }
  return new Date(value);
}

function asUtcDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

export function toLocalIsoDate(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatDate(value: Date | string) {
  const plainDate = typeof value === "string" && plainDatePattern.test(value) ? asUtcDate(value) : null;
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    ...(plainDate ? { timeZone: "UTC" } : {}),
  }).format(plainDate || asDate(value));
}

export function formatLongDate(value: Date | string) {
  const plainDate = typeof value === "string" && plainDatePattern.test(value) ? asUtcDate(value) : null;
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
    ...(plainDate ? { timeZone: "UTC" } : {}),
  }).format(plainDate || asDate(value));
}

export function formatDateTime(value: Date | string) {
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(asDate(value));
}

export function formatMonthYear(value: Date | string) {
  const label = new Intl.DateTimeFormat(locale, {
    month: "long",
    year: "numeric",
  }).format(asDate(value));
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function formatNumber(value: number, fractionDigits = 0) {
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);
}

export function formatHours(value: number, fractionDigits = 2) {
  return `${formatNumber(value, fractionDigits)} h`;
}

export function formatCurrency(value: number, fractionDigits = 0) {
  return `${formatNumber(value, fractionDigits)} EUR`;
}

export function reportCountLabel(count: number) {
  if (locale === "en-US") {
    return `${count} ${count === 1 ? "report" : "reports"}`;
  }
  if (locale === "el-GR") {
    return `${count} ${count === 1 ? "αναφορά" : "αναφορές"}`;
  }
  return `${count} ${count === 1 ? "Bericht" : "Berichte"}`;
}

export function setFormatLanguage(language: "de" | "en" | "el") {
  locale =
    language === "en"
      ? "en-US"
      : language === "el"
        ? "el-GR"
        : "de-DE";
}
