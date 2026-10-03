import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.restoreAllMocks();
  vi.resetModules();
});

describe("apiRequest", () => {
  it("does not report a successful save when hosting returns an HTML fallback", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response("<html>Not an API</html>", { status: 200 }),
        ),
    );
    const { apiRequest } = await import("./api");
    await expect(apiRequest("/projects/")).rejects.toMatchObject({
      name: "ApiError",
    });
  });
  it("gets a CSRF token and sends credentials for mutations", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ csrfToken: "secure-token" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ id: "brief-1" }), {
          status: 201,
          headers: { "Content-Type": "application/json" },
        }),
      );
    vi.stubGlobal("fetch", fetchMock);
    const { apiRequest } = await import("./api");

    await apiRequest("/public/briefs/", {
      method: "POST",
      body: JSON.stringify({ company: "Acme" }),
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const options = fetchMock.mock.calls[1][1];
    expect(options.credentials).toBe("include");
    expect(options.headers.get("X-CSRFToken")).toBe("secure-token");
    expect(options.headers.get("Content-Type")).toBe("application/json");
  });

  it("surfaces structured server validation errors", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ csrfToken: "token" }), { status: 200 }),
        )
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              error: {
                details: { detail: "That time is no longer available." },
              },
            }),
            { status: 409 },
          ),
        ),
    );
    const { apiRequest } = await import("./api");

    await expect(
      apiRequest("/public/appointments/", { method: "POST", body: "{}" }),
    ).rejects.toMatchObject({
      message: "That time is no longer available.",
      status: 409,
    });
  });
});
