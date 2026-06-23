const LOCALE = "de-DE";

const SHORT_DATE_FORMATTER = new Intl.DateTimeFormat(LOCALE, {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const LONG_DATE_FORMATTER = new Intl.DateTimeFormat(LOCALE, {
  day: "numeric",
  month: "long",
  year: "numeric",
});

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat(LOCALE, {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const MONTH_YEAR_FORMATTER = new Intl.DateTimeFormat(LOCALE, {
  month: "long",
  year: "numeric",
});

function asDate(value: Date | string) {
  if (value instanceof Date) return value;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year, month - 1, day);
  }
  return new Date(value);
}

export function formatDate(value: Date | string) {
  return SHORT_DATE_FORMATTER.format(asDate(value));
}

export function formatLongDate(value: Date | string) {
  return LONG_DATE_FORMATTER.format(asDate(value));
}

export function formatDateTime(value: Date | string) {
  return DATE_TIME_FORMATTER.format(asDate(value));
}

export function formatMonthYear(value: Date | string) {
  const label = MONTH_YEAR_FORMATTER.format(asDate(value));
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function formatNumber(value: number, fractionDigits = 0) {
  return new Intl.NumberFormat(LOCALE, {
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
  return `${count} ${count === 1 ? "Bericht" : "Berichte"}`;
}
