import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.restoreAllMocks();
  vi.resetModules();
});

describe("apiRequest", () => {
  it("shares the prefetched guard and preserves the spam trap value on public submits", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            csrfToken: "csrf",
            formGuard: {
              token: "signed-form-guard",
              waitMs: 0,
              maxAgeMs: 7200000,
            },
          }),
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ id: "saved" }), { status: 201 }),
      );
    vi.stubGlobal("fetch", fetchMock);
    const { preparePublicForm, apiRequest } = await import("./api");
    await Promise.all([preparePublicForm(), preparePublicForm()]);
    await apiRequest("/public/briefs/", {
      method: "POST",
      body: JSON.stringify({ contact_fax: "", name: "Alex" }),
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({
      name: "Alex",
      contact_fax: "",
      form_guard: "signed-form-guard",
    });
  });
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

it.each([429, 503])(
  "replaces technical HTTP %s errors with helpful visitor-facing copy",
  async (status) => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            detail: "Request was throttled. Expected available in 143 seconds.",
          }),
          { status },
        ),
      ),
    );
    const { apiRequest } = await import("./api");
    await expect(apiRequest("/public/availability/")).rejects.toMatchObject({
      status,
      message: expect.stringContaining("Please try again"),
    });
    try {
      await apiRequest("/public/availability/");
    } catch (error) {
      expect(error.message).not.toMatch(/throttled|143 seconds/);
    }
  },
);
