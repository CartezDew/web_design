import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, expect, it, vi } from "vitest";
import ConfirmationPage from "./ConfirmationPage";
import { apiRequest } from "../api";
vi.mock("../api", () => ({ apiRequest: vi.fn() }));
beforeEach(() => {
  vi.clearAllMocks();
});
function mount(kind = "appointment") {
  render(
    <MemoryRouter
      initialEntries={[`/confirm?kind=${kind}&id=test#token=secure`]}
    >
      <ConfirmationPage />
    </MemoryRouter>,
  );
}
it("reads without confirming and books only on a deliberate button press", async () => {
  apiRequest.mockResolvedValue({
    kind: "appointment",
    confirmed: false,
    starts_at: "2026-12-10T15:00:00Z",
    expires_at: "2026-12-09T15:00:00Z",
  });
  mount();
  const button = await screen.findByRole("button", {
    name: "Confirm appointment",
  });
  expect(screen.getAllByText(/10:00 AM EST/)).toHaveLength(2);
  expect(apiRequest.mock.calls[0][0]).not.toContain("token=");
  expect(apiRequest.mock.calls[0][1]).toEqual({
    headers: { Authorization: "Bearer secure" },
  });
  fireEvent.click(button);
  await screen.findByText("Your call is confirmed.");
  const [path, options] = apiRequest.mock.calls.at(-1);
  expect(path).toBe("/public/confirm/");
  expect(options.method).toBe("POST");
  expect(JSON.parse(options.body)).toMatchObject({
    kind: "appointment",
    id: "test",
    token: "secure",
  });
});
it("makes clear brief verification does not start paid work", async () => {
  apiRequest.mockResolvedValue({ kind: "brief", confirmed: false });
  mount("brief");
  const button = await screen.findByRole("button", { name: "Confirm email" });
  expect(
    screen.getByText(/doesn’t commit you to a project or payment/),
  ).toBeInTheDocument();
  fireEvent.click(button);
  await screen.findByText("Your email is confirmed.");
  expect(screen.getByText(/before any work begins/)).toBeInTheDocument();
});
it("shows an expired-link recovery path without a confirmation button", async () => {
  apiRequest.mockRejectedValue(
    new Error(
      "This confirmation link has expired. Your request is still saved.",
    ),
  );
  mount();
  expect(await screen.findByRole("alert")).toHaveTextContent("expired");
  expect(
    screen.queryByRole("button", { name: "Confirm appointment" }),
  ).not.toBeInTheDocument();
  expect(
    screen.getByRole("link", { name: "choose another time" }),
  ).toHaveAttribute("href", "/#book");
});
it("does not claim success if confirmation fails", async () => {
  apiRequest
    .mockResolvedValueOnce({ kind: "brief", confirmed: false })
    .mockRejectedValueOnce(new Error("Try again shortly."));
  mount("brief");
  fireEvent.click(await screen.findByRole("button", { name: "Confirm email" }));
  await screen.findByRole("alert");
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Confirm email" })).toBeEnabled(),
  );
  expect(
    screen.queryByText("Your email is confirmed."),
  ).not.toBeInTheDocument();
});
