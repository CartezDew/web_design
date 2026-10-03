const API_BASE = (import.meta.env.VITE_API_BASE_URL || "/api/v1").replace(
  /\/$/,
  "",
);
let csrfToken = "";
let csrfRequest = null;
export class ApiError extends Error {
  constructor(message, status, details) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}
export function resetCsrf() {
  csrfToken = "";
  csrfRequest = null;
}
async function getCsrfToken() {
  if (csrfToken) return csrfToken;
  if (!csrfRequest)
    csrfRequest = fetch(`${API_BASE}/auth/csrf/`, { credentials: "include" })
      .then(async (response) => {
        if (!response.ok)
          throw new ApiError(
            "Unable to start a secure session. Please try again.",
            response.status,
          );
        csrfToken = (await response.json()).csrfToken;
        return csrfToken;
      })
      .finally(() => {
        csrfRequest = null;
      });
  return csrfRequest;
}
function errorMessage(details) {
  if (typeof details === "string") return details;
  if (Array.isArray(details)) return details.map(errorMessage).join(" ");
  if (details && typeof details === "object") {
    if (details.detail) return errorMessage(details.detail);
    return Object.entries(details)
      .map(
        ([key, value]) =>
          `${key === "non_field_errors" ? "" : key.replaceAll("_", " ") + ": "}${errorMessage(value)}`,
      )
      .join(" ");
  }
  return "The request could not be completed.";
}
export async function apiRequest(path, options = {}) {
  const method = options.method || "GET";
  const headers = new Headers(options.headers || {});
  try {
    if (!["GET", "HEAD", "OPTIONS"].includes(method.toUpperCase()))
      headers.set("X-CSRFToken", await getCsrfToken());
    if (
      options.body &&
      !(options.body instanceof FormData) &&
      !headers.has("Content-Type")
    )
      headers.set("Content-Type", "application/json");
    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      method,
      headers,
      credentials: "include",
    });
    if (response.status === 204) return null;
    const data = await response.json().catch(() => {
      throw new ApiError(
        "The service is temporarily unavailable. Please try again or email letsbuild@marcdbycartez.com.",
        response.status || 502,
      );
    });
    if (!response.ok) {
      if (response.status === 403) resetCsrf();
      throw new ApiError(
        response.status === 429
          ? "Please try again shortly. Your information is still here. If you need help, email letsbuild@marcdbycartez.com."
          : response.status >= 500
            ? "The service is temporarily unavailable. Your information is still here. Please try again or email letsbuild@marcdbycartez.com."
            : errorMessage(data.error?.details || data),
        response.status,
        data.error?.details || data,
      );
    }
    return data;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(
      "We couldn’t reach the server. Your information is still here. Please try again, or email letsbuild@marcdbycartez.com.",
      0,
    );
  }
}
export async function uploadAsset({
  file,
  group = "project",
  brief,
  project,
  uploadToken,
  requestKey,
  onProgress,
  onPrepared,
}) {
  const type =
    file.type ||
    {
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      webp: "image/webp",
      pdf: "application/pdf",
    }[file.name.split(".").pop().toLowerCase()];
  const prepared = await apiRequest("/assets/prepare/", {
    method: "POST",
    body: JSON.stringify({
      name: file.name,
      content_type: type,
      size: file.size,
      group,
      brief,
      project,
      upload_token: uploadToken,
      request_key: requestKey,
    }),
  });
  onPrepared?.(prepared.asset.id);
  if (prepared.asset.uploaded) {
    onProgress?.(100);
    return prepared.asset;
  }
  await new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", prepared.upload_url);
    xhr.setRequestHeader("Content-Type", type);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable)
        onProgress?.(Math.round((e.loaded / e.total) * 95));
    };
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve()
        : reject(
            new ApiError(
              `Could not upload ${file.name}. Please retry.`,
              xhr.status,
            ),
          );
    xhr.onerror = () =>
      reject(new ApiError("Upload interrupted. Please retry the file.", 0));
    xhr.ontimeout = () =>
      reject(new ApiError("Upload timed out. Please retry the file.", 0));
    xhr.timeout = 120000;
    xhr.send(file);
  });
  const asset = await apiRequest(`/assets/${prepared.asset.id}/finalize/`, {
    method: "POST",
    body: JSON.stringify({ upload_token: uploadToken }),
  });
  onProgress?.(100);
  return asset;
}
export async function releaseAsset(id, uploadToken) {
  return apiRequest(`/assets/${id}/release/`, {
    method: "POST",
    body: JSON.stringify({ upload_token: uploadToken }),
  });
}
export { API_BASE };
