export const CONSULTATION_TIME_ZONE = "America/New_York";
export const CONSULTATION_TIME_LABEL = "Eastern time (EST/EDT)";

export function consultationDate(value) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: CONSULTATION_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(value));
  return ["year", "month", "day"]
    .map((type) => parts.find((part) => part.type === type).value)
    .join("-");
}

export function formatConsultation(value) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: CONSULTATION_TIME_ZONE,
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(new Date(value));
}
