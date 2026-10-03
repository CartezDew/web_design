import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { expect, it, vi } from "vitest";
import { AppointmentsPanel, AvailabilityPanel } from "./ManagementPanels";

vi.mock("../AuthContext", () => ({
  useAuth: () => ({ user: { is_admin: false } }),
}));
vi.mock("./Dashboard", () => ({ More: () => null }));
vi.mock("./useRecords", () => ({
  useRecords: (path) => ({
    data:
      path === "/appointments/"
        ? [
            {
              id: "winter",
              starts_at: "2026-12-10T15:00:00Z",
              status: "confirmed",
              first_name: "Alex",
              last_name: "Client",
              email: "alex@example.test",
            },
            {
              id: "summer",
              starts_at: "2026-07-10T14:00:00Z",
              status: "completed",
              first_name: "Alex",
              last_name: "Client",
              email: "alex@example.test",
            },
          ]
        : [],
    loading: false,
    error: "",
    reload: vi.fn(),
  }),
}));

it("shows client and admin scheduling guidance in Eastern time with correct appointment abbreviations", () => {
  render(
    <MemoryRouter>
      <AppointmentsPanel />
      <AvailabilityPanel />
    </MemoryRouter>,
  );
  expect(
    screen.getByText(/December 10, 2026 at 10:00 AM EST/),
  ).toBeInTheDocument();
  expect(screen.getByText(/July 10, 2026 at 10:00 AM EDT/)).toBeInTheDocument();
  expect(
    screen.getByText("All meetings and scheduling use Eastern time (EST/EDT)."),
  ).toBeInTheDocument();
  expect(
    screen.getByText(/Clients see the same Eastern times/),
  ).toBeInTheDocument();
  expect(screen.queryByText(/selected time zone/)).not.toBeInTheDocument();
});
