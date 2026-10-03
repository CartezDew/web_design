import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { LeadContactProvider } from "../components/LeadContactContext";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, expect, it, vi } from "vitest";
import IntakePage from "./IntakePage";
import { apiRequest, uploadAsset } from "../api";

vi.mock("../api", () => ({
  apiRequest: vi.fn(),
  uploadAsset: vi.fn(),
  releaseAsset: vi.fn(),
  preparePublicForm: vi.fn().mockResolvedValue(),
}));

beforeEach(() => vi.clearAllMocks());

function startBrief() {
  render(
    <MemoryRouter>
      <LeadContactProvider>
        <IntakePage />
      </LeadContactProvider>
    </MemoryRouter>,
  );
  fireEvent.change(screen.getByLabelText("Your name", { exact: false }), {
    target: { value: "Alex Client" },
  });
  fireEvent.change(screen.getByLabelText("Email address", { exact: false }), {
    target: { value: "alex@example.test" },
  });
  fireEvent.change(
    screen.getByLabelText("What do you have in mind?", { exact: false }),
    { target: { value: "A booking website for my business." } },
  );
}

it("retains the brief across steps, accepts an optional empty date and confirms only after saving", async () => {
  apiRequest.mockResolvedValue({ id: "saved-brief", upload_token: "token" });
  render(
    <MemoryRouter>
      <LeadContactProvider>
        <IntakePage />
      </LeadContactProvider>
    </MemoryRouter>,
  );
  fireEvent.change(screen.getByLabelText("Your name", { exact: false }), {
    target: { value: "Alex Client" },
  });
  fireEvent.change(screen.getByLabelText("Email address", { exact: false }), {
    target: { value: "alex@example.test" },
  });
  fireEvent.change(
    screen.getByLabelText("What do you have in mind?", { exact: false }),
    { target: { value: "A website for my business." } },
  );
  fireEvent.click(screen.getByRole("button", { name: "Continue" }));
  fireEvent.click(screen.getByRole("button", { name: "Continue" }));
  expect(screen.getByText("A website for my business.")).toBeInTheDocument();
  fireEvent.click(
    screen.getByRole("button", { name: "Send my project brief" }),
  );
  await waitFor(() =>
    expect(screen.getByText("Your idea is in good hands.")).toBeInTheDocument(),
  );
  expect(JSON.parse(apiRequest.mock.calls[0][1].body)).toMatchObject({
    name: "Alex Client",
    launch_date: null,
  });
});

it("preserves discovery answers when editing the review and sends them in supported backend fields", async () => {
  apiRequest.mockResolvedValue({
    id: "discovery-brief",
    upload_token: "token",
  });
  startBrief();
  fireEvent.change(
    screen.getByLabelText("Who do you want to reach? (optional)"),
    { target: { value: "Families who need weekend appointments." } },
  );
  fireEvent.change(
    screen.getByLabelText("Current website or domain (optional)"),
    { target: { value: "example.test" } },
  );
  fireEvent.click(screen.getByRole("button", { name: "Continue" }));
  expect(
    screen.queryByText("Comfortable budget range"),
  ).not.toBeInTheDocument();
  fireEvent.change(
    screen.getByLabelText("What would success look like? (optional)"),
    { target: { value: "More qualified bookings." } },
  );
  fireEvent.change(screen.getByLabelText("Brand direction"), {
    target: { value: "Keep our logo and warm colors." },
  });
  fireEvent.change(screen.getByLabelText("Tools to connect"), {
    target: { value: "Stripe and our calendar." },
  });
  fireEvent.change(screen.getByLabelText("Who will approve the work?"), {
    target: { value: "Alex and my business partner." },
  });
  fireEvent.click(screen.getByRole("button", { name: "Continue" }));
  expect(
    screen.getByText(
      /screenshots of websites you like, logos and current images/,
    ),
  ).toBeInTheDocument();
  expect(screen.getByText("More qualified bookings.")).toBeInTheDocument();
  expect(screen.getByText("Stripe and our calendar.")).toBeInTheDocument();
  fireEvent.click(
    screen.getByRole("button", { name: "Edit project direction" }),
  );
  expect(
    screen.getByLabelText("What would success look like? (optional)"),
  ).toHaveValue("More qualified bookings.");
  fireEvent.click(screen.getByRole("button", { name: "Continue" }));
  fireEvent.click(
    screen.getByRole("button", { name: "Send my project brief" }),
  );
  await waitFor(() =>
    expect(screen.getByText("Your idea is in good hands.")).toBeInTheDocument(),
  );
  const payload = JSON.parse(apiRequest.mock.calls[0][1].body);
  expect(payload).toMatchObject({
    mission: "Families who need weekend appointments.",
    domain: "example.test",
    success: "More qualified bookings.",
    brand: "Keep our logo and warm colors.",
    integrations: "Stripe and our calendar.",
  });
  expect(payload.notes).toContain(
    "Project approver: Alex and my business partner.",
  );
  expect(payload).not.toHaveProperty("decision_maker");
  expect(payload).not.toHaveProperty("budget");
});

it("retries only failed attachments without saving a duplicate brief or claiming success too early", async () => {
  apiRequest.mockResolvedValue({ id: "upload-brief", upload_token: "token" });
  uploadAsset
    .mockResolvedValueOnce({ id: "first" })
    .mockRejectedValueOnce(new Error("Upload interrupted."))
    .mockResolvedValueOnce({ id: "second" });
  startBrief();
  fireEvent.click(screen.getByRole("button", { name: "Continue" }));
  fireEvent.click(screen.getByRole("button", { name: "Continue" }));
  fireEvent.change(screen.getByLabelText("Add images, screenshots, or PDFs"), {
    target: {
      files: [
        new File(["one"], "one.png", { type: "image/png" }),
        new File(["two"], "two.pdf", { type: "application/pdf" }),
      ],
    },
  });
  fireEvent.click(
    screen.getByRole("button", { name: "Send my project brief" }),
  );
  await waitFor(() =>
    expect(
      screen.getByText(/Your brief is saved. Some files still need to upload/),
    ).toBeInTheDocument(),
  );
  expect(
    screen.queryByText("Your idea is in good hands."),
  ).not.toBeInTheDocument();
  fireEvent.click(
    screen.getByRole("button", { name: "Retry remaining files" }),
  );
  await waitFor(() =>
    expect(screen.getByText("Your idea is in good hands.")).toBeInTheDocument(),
  );
  expect(apiRequest).toHaveBeenCalledTimes(1);
  expect(uploadAsset).toHaveBeenCalledTimes(3);
  expect(uploadAsset.mock.calls.map(([input]) => input.file.name)).toEqual([
    "one.png",
    "two.pdf",
    "two.pdf",
  ]);
});
