import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { LeadContactProvider } from "../components/LeadContactContext";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, expect, it, vi } from "vitest";
import BookingPage, { ManageBooking } from "./BookingPage";
import { apiRequest } from "../api";
import { consultationDate, formatConsultation } from "../content/scheduling";

vi.mock("../api", () => ({
  apiRequest: vi.fn(),
  preparePublicForm: vi.fn().mockResolvedValue(),
  API_BASE: "/api/v1",
}));
vi.mock("../Reveal", () => ({
  default: ({ as: Element = "div", children, delay, ...props }) => (
    <Element {...props}>{children}</Element>
  ),
}));
// Isolate booking state from React Aria's calendar internals.
vi.mock("../components/ConsultationDatePicker", () => ({
  default: ({ onChange, disabled }) => (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange("2026-12-10")}
    >
      Choose a test date
    </button>
  ),
}));

beforeEach(() => {
  vi.clearAllMocks();
  apiRequest.mockImplementation((path) =>
    Promise.resolve(
      path.includes("availability")
        ? [{ date: "2026-12-10", slots: ["2026-12-10T15:00:00Z"] }]
        : { id: "saved-call", manage_token: "secure-token" },
    ),
  );
});

it("uses Eastern dates and winter/summer abbreviations independent of the browser zone", () => {
  expect(consultationDate("2026-12-10T02:00:00Z")).toBe("2026-12-09");
  expect(formatConsultation("2026-12-10T15:00:00Z")).toContain("10:00 AM EST");
  expect(formatConsultation("2026-07-10T14:00:00Z")).toContain("10:00 AM EDT");
});

it("locks contact fields until a slot is selected and reveals errors only after requesting", async () => {
  render(
    <MemoryRouter>
      <LeadContactProvider>
        <BookingPage />
      </LeadContactProvider>
    </MemoryRouter>,
  );
  const request = screen.getByRole("button", { name: "Request consultation" });
  expect(request).toHaveAttribute("data-incomplete", "true");
  expect(screen.getByRole("textbox", { name: "First name" })).toHaveAttribute(
    "readonly",
  );
  expect(
    screen.getByRole("textbox", { name: "Email address" }),
  ).toHaveAttribute("readonly");
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  expect(screen.queryByText("Your time zone")).not.toBeInTheDocument();
  fireEvent.focus(screen.getByRole("textbox", { name: "First name" }));
  expect(
    within(screen.getByRole("alert")).getByText(
      "Choose an available date and time.",
    ),
  ).toBeInTheDocument();
  expect(screen.queryByText("Enter your first name.")).not.toBeInTheDocument();
  fireEvent.click(request);
  const summary = screen.getByRole("alert");
  expect(
    within(summary).getByText("Choose an available date and time."),
  ).toBeInTheDocument();
  expect(
    within(summary).getByText("Enter your first name."),
  ).toBeInTheDocument();
  expect(
    apiRequest.mock.calls.filter(([path]) => path === "/public/appointments/"),
  ).toHaveLength(0);
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: "Choose a test date" }),
    ).toBeEnabled(),
  );
  fireEvent.click(screen.getByRole("button", { name: "Choose a test date" }));
  fireEvent.click(screen.getByRole("radio", { name: "10:00 AM" }));
  expect(
    screen.getByRole("textbox", { name: "First name" }),
  ).not.toHaveAttribute("readonly");
  fireEvent.change(screen.getByRole("textbox", { name: "First name" }), {
    target: { value: " Alex " },
  });
  fireEvent.change(screen.getByRole("textbox", { name: "Last name" }), {
    target: { value: "Client" },
  });
  fireEvent.change(screen.getByRole("textbox", { name: "Email address" }), {
    target: { value: "invalid" },
  });
  expect(request).toHaveAttribute("data-incomplete", "true");
  fireEvent.change(screen.getByRole("textbox", { name: "Email address" }), {
    target: { value: "alex@example.con" },
  });
  expect(request).toHaveAttribute("data-incomplete", "true");
  fireEvent.change(screen.getByRole("textbox", { name: "Email address" }), {
    target: { value: "alex@example.test" },
  });
  expect(request).not.toHaveAttribute("data-incomplete");
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  fireEvent.click(request);
  await screen.findByText("Check your email to confirm.");
  expect(
    screen.getByText(/December 10, 2026 at 10:00 AM EST/),
  ).toBeInTheDocument();
  const [, options] = apiRequest.mock.calls.find(
    ([path]) => path === "/public/appointments/",
  );
  expect(JSON.parse(options.body)).toMatchObject({
    first_name: "Alex",
    starts_at: "2026-12-10T15:00:00Z",
  });
});

it("keeps validation quiet while choosing a slot and locks fields again when the date changes", async () => {
  render(
    <MemoryRouter>
      <LeadContactProvider>
        <BookingPage />
      </LeadContactProvider>
    </MemoryRouter>,
  );
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: "Choose a test date" }),
    ).toBeEnabled(),
  );
  fireEvent.click(screen.getByRole("button", { name: "Choose a test date" }));
  expect(screen.getByRole("textbox", { name: "First name" })).toHaveAttribute(
    "readonly",
  );
  fireEvent.click(screen.getByRole("radio", { name: "10:00 AM" }));
  fireEvent.change(screen.getByRole("textbox", { name: "First name" }), {
    target: { value: "Alex" },
  });
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  expect(screen.queryByText("Enter your last name.")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Choose a test date" }));
  expect(screen.getByRole("textbox", { name: "First name" })).toHaveAttribute(
    "readonly",
  );
  expect(screen.getByRole("textbox", { name: "First name" })).toHaveValue(
    "Alex",
  );
});

it("labels guest booking management in Eastern time", async () => {
  apiRequest.mockResolvedValue({
    starts_at: "2026-12-10T15:00:00Z",
    status: "confirmed",
  });
  render(
    <MemoryRouter initialEntries={["/book/manage?id=test&token=secure"]}>
      <LeadContactProvider>
        <ManageBooking />
      </LeadContactProvider>
    </MemoryRouter>,
  );
  expect(
    await screen.findByText(/December 10, 2026 at 10:00 AM EST/),
  ).toBeInTheDocument();
  expect(
    screen.getByText("All appointments are shown in Eastern time (EST/EDT)."),
  ).toBeInTheDocument();
});

it("shares contact edits in both directions and prevents intake progression with incomplete contact details", async () => {
  const { default: IntakePage } = await import("./IntakePage");
  render(
    <MemoryRouter>
      <LeadContactProvider>
        <BookingPage />
        <IntakePage />
      </LeadContactProvider>
    </MemoryRouter>,
  );
  const booking = within(
    screen.getByRole("region", {
      name: /A real conversation/,
    }),
  );
  const intake = within(
    screen.getByRole("region", { name: "Tell me what you’re building." }),
  );
  expect(intake.getByRole("button", { name: "Continue" })).toHaveAttribute(
    "data-incomplete",
    "true",
  );
  await waitFor(() =>
    expect(
      booking.getByRole("button", { name: "Choose a test date" }),
    ).toBeEnabled(),
  );
  fireEvent.click(booking.getByRole("button", { name: "Choose a test date" }));
  fireEvent.click(booking.getByRole("radio", { name: "10:00 AM" }));
  fireEvent.change(booking.getByRole("textbox", { name: "First name" }), {
    target: { value: "Alex" },
  });
  fireEvent.change(booking.getByRole("textbox", { name: "Last name" }), {
    target: { value: "Client" },
  });
  fireEvent.change(booking.getByRole("textbox", { name: "Email address" }), {
    target: { value: "alex@example.test" },
  });
  expect(intake.getByRole("textbox", { name: "Your name" })).toHaveValue(
    "Alex Client",
  );
  expect(intake.getByRole("textbox", { name: "Email address" })).toHaveValue(
    "alex@example.test",
  );
  expect(intake.getByRole("button", { name: "Continue" })).toHaveAttribute(
    "data-incomplete",
    "true",
  );
  fireEvent.change(intake.getByRole("textbox", { name: "Your name" }), {
    target: { value: "Mary Ann Client" },
  });
  fireEvent.change(intake.getByRole("textbox", { name: "Email address" }), {
    target: { value: "mary@example.test" },
  });
  expect(booking.getByRole("textbox", { name: "First name" })).toHaveValue(
    "Mary",
  );
  expect(booking.getByRole("textbox", { name: "Last name" })).toHaveValue(
    "Ann Client",
  );
  expect(booking.getByRole("textbox", { name: "Email address" })).toHaveValue(
    "mary@example.test",
  );
  fireEvent.change(
    intake.getByRole("textbox", { name: "What do you have in mind?" }),
    { target: { value: "A website with online bookings." } },
  );
  expect(intake.getByRole("button", { name: "Continue" })).not.toHaveAttribute(
    "data-incomplete",
  );
  fireEvent.change(intake.getByRole("textbox", { name: "Email address" }), {
    target: { value: "invalid" },
  });
  expect(intake.getByRole("button", { name: "Continue" })).toHaveAttribute(
    "data-incomplete",
    "true",
  );
  fireEvent.click(intake.getByRole("button", { name: "Continue" }));
  expect(
    within(intake.getByRole("alert")).getByText(
      "Enter a real email address, like name@example.com.",
    ),
  ).toBeInTheDocument();
  fireEvent.change(intake.getByRole("textbox", { name: "Email address" }), {
    target: { value: "mary@example.test" },
  });
  fireEvent.click(intake.getByRole("button", { name: "Continue" }));
  expect(intake.getByText("Let’s give your idea shape.")).toBeInTheDocument();
});

it("shows a neutral calendar recovery message without technical errors before a submission attempt", async () => {
  apiRequest.mockRejectedValue(
    new Error("Request was throttled. Expected available in 143 seconds."),
  );
  render(
    <MemoryRouter>
      <LeadContactProvider>
        <BookingPage />
      </LeadContactProvider>
    </MemoryRouter>,
  );
  expect(
    await screen.findByText(
      "The calendar is temporarily unavailable. Please try again shortly.",
    ),
  ).toBeInTheDocument();
  expect(screen.queryByText(/throttled|143 seconds/)).not.toBeInTheDocument();
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Try again" })).toBeEnabled();
  expect(
    screen.getByRole("link", { name: "email me to arrange a call" }),
  ).toHaveAttribute("href", "mailto:letsbuild@marcdbycartez.com");
});
