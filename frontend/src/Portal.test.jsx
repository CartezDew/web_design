import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "./AuthContext";
import { SignInPage } from "./Portal";

describe("SignInPage", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ user: null }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );
  });

  it("renders the secure account controls after session loading", async () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <SignInPage />
        </AuthProvider>
      </MemoryRouter>,
    );

    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /sign in/i }),
      ).toBeInTheDocument(),
    );
    expect(screen.getByLabelText("Email")).toHaveAttribute("type", "email");
    expect(screen.getByLabelText("Password")).toHaveAttribute(
      "type",
      "password",
    );
    expect(
      screen.getByRole("link", { name: /forgot your password/i }),
    ).toBeInTheDocument();
  });
});
