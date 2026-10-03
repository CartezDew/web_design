import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { PrivacyAnalyticsSettings } from "./SiteAnalytics";
import { CONSENT_KEY, chooseConsent, readConsent, setConfig, setPolicy } from "./client";
import { apiRequest } from "../api";
vi.mock("../api", () => ({ apiRequest: vi.fn() }));
beforeEach(() => {
  vi.stubEnv("VITE_GA_ENABLE_DEV", "true");
  window.history.replaceState({}, "", "/");
  setConfig({ measurement_id: "G-TEST12345" });
  setPolicy({ automatic_analytics: true });
  chooseConsent(true);
  apiRequest.mockResolvedValue(null);
});
afterEach(() => { vi.unstubAllEnvs(); });
it("applies off before sending only an anonymous signal; a failed counter cannot undo it", async () => {
  apiRequest.mockImplementation(() => { expect(readConsent()).toBe(false); return Promise.reject(new Error("offline")); });
  render(<PrivacyAnalyticsSettings />);
  fireEvent.click(screen.getByRole("switch", { name: "Website analytics" }));
  await waitFor(() => expect(apiRequest).toHaveBeenCalledTimes(1));
  expect(JSON.parse(apiRequest.mock.calls[0][1].body)).toEqual({ automation_signal: "unknown" });
  expect(JSON.parse(localStorage.getItem(CONSENT_KEY)).granted).toBe(false);
  expect(screen.getByRole("switch")).not.toBeChecked();
  expect(screen.getByRole("status")).toHaveTextContent("saved");
});
it("disables the switch when the browser requests privacy", () => {
  act(() => setPolicy({ automatic_analytics: true, privacy_signal: true }));
  render(<PrivacyAnalyticsSettings />);
  expect(screen.getByRole("switch")).toBeDisabled();
  expect(screen.getByRole("switch")).not.toBeChecked();
  expect(screen.getByText(/browser’s privacy signal/)).toBeInTheDocument();
});
