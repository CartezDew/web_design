import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { apiRequest } from "../api";
import InsightsPanel from "./InsightsPanel";
vi.mock("../api", () => ({ apiRequest: vi.fn() }));
const data = { tracking: { configured: false }, totals: { briefs: 2, confirmed_briefs: 1, projects: 1, launched_projects: 0, booking_requests: 0, confirmed_bookings: 0, completed_consultations: 0, cancelled_bookings: 0 }, breakdowns: Object.fromEntries(["business_type", "service_interest", "package_tier", "primary_goal", "content_readiness", "campaign_source", "campaign_id", "device_category"].map((key) => [key, []])) };
beforeEach(() => vi.clearAllMocks());
it("shows database results without claiming GA is connected and reloads the selected period", async () => {
  apiRequest.mockResolvedValue(data);
  render(<InsightsPanel />);
  expect(await screen.findByText(/connection is pending/)).toBeInTheDocument();
  expect(screen.queryByRole("link", { name: /Open website analytics/ })).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("Inquiry period"), { target: { value: "30" } });
  await waitFor(() => expect(apiRequest).toHaveBeenLastCalledWith("/admin/insights/?days=30"));
  expect(screen.getAllByText("No inquiries in this period yet.")).toHaveLength(8);
});
it("can retry a failed request", async () => {
  apiRequest.mockRejectedValueOnce(new Error("Temporarily unavailable")).mockResolvedValue(data);
  render(<InsightsPanel />);
  fireEvent.click(await screen.findByRole("button", { name: "Try again" }));
  expect(await screen.findByText(/connection is pending/)).toBeInTheDocument();
});
