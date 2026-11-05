import { describe, expect, it, vi, afterEach } from "vitest";
import { addDays, isoDateToUtc, todayIn } from "./dates";

describe("date helpers", () => {
  afterEach(() => vi.useRealTimers());

  it("reads today in the requested time zone", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-01T03:30:00Z"));
    expect(todayIn("America/New_York")).toBe("2026-02-28");
    expect(todayIn("UTC")).toBe("2026-03-01");
  });

  it("adds days across month and year boundaries", () => {
    expect(addDays("2026-02-28", 1)).toBe("2026-03-01");
    expect(addDays("2026-12-15", 59)).toBe("2027-02-12");
  });

  it("parses ISO dates at UTC midnight", () => {
    expect(isoDateToUtc("2026-07-04").toISOString()).toBe(
      "2026-07-04T00:00:00.000Z",
    );
  });
});
