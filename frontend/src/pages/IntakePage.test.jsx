import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { expect, it, vi } from "vitest";
import IntakePage from "./IntakePage";
import { apiRequest } from "../api";

vi.mock("../api", () => ({
  apiRequest: vi.fn(),
  uploadAsset: vi.fn(),
  releaseAsset: vi.fn(),
}));

it("retains the brief across steps, accepts an optional empty date and confirms only after saving", async () => {
  apiRequest.mockResolvedValue({ id: "saved-brief", upload_token: "token" });
  render(
    <MemoryRouter>
      <IntakePage />
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
