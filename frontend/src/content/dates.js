// Tiny ISO-date helpers so first-paint code doesn't need @internationalized/date.

// Today's date (YYYY-MM-DD) in `timeZone`, or the visitor's zone when omitted.
export function todayIn(timeZone) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const part = (type) => parts.find((p) => p.type === type).value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function addDays(isoDate, days) {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

// Midnight UTC for a YYYY-MM-DD string, for formatting with timeZone "UTC".
export function isoDateToUtc(isoDate) {
  return new Date(`${isoDate}T00:00:00Z`);
}
