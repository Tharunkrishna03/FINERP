export const API_BASE_URL = "/api";

let refreshInFlight: Promise<string | null> | null = null;

function isAuthEndpoint(url: string): boolean {
  const pathname = new URL(
    url,
    typeof window === "undefined" ? "http://localhost" : window.location.origin,
  ).pathname;
  return pathname === "/api/token" || pathname === "/api/token/" || pathname.startsWith("/api/token/refresh");
}

async function refreshAccessToken(): Promise<string | null> {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    const refresh = localStorage.getItem("refresh_token");
    if (!refresh) return null;

    try {
      const response = await fetch(`${API_BASE_URL}/token/refresh/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh }),
        cache: "no-store",
      });
      const body = await response.json();
      const data = body?.success === true ? body.data : body;
      if (!response.ok || typeof data?.access !== "string") return null;

      localStorage.setItem("access_token", data.access);
      if (typeof data.refresh === "string") {
        localStorage.setItem("refresh_token", data.refresh);
      }
      return data.access as string;
    } catch {
      return null;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

export async function fetchApi(endpoint: string, options: RequestInit = {}) {
  const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  const url = /^https?:\/\//i.test(endpoint)
    ? endpoint
    : cleanEndpoint.startsWith("/api")
      ? cleanEndpoint
      : `${API_BASE_URL}${cleanEndpoint}`;
  const authEndpoint = isAuthEndpoint(url);
  const headers = new Headers(options.headers);
  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;

  if (!isFormData && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (typeof window !== "undefined" && !authEndpoint) {
    const requestOrigin = new URL(url, window.location.origin).origin;
    const token = requestOrigin === window.location.origin
      ? localStorage.getItem("access_token")
      : null;
    if (token) headers.set("Authorization", `Bearer ${token}`);
  }

  const config: RequestInit = {
    ...options,
    cache: options.cache ?? "no-store",
    headers,
  };
  
  try {
    let response = await fetch(url, config);

    // Refresh an expired access token once before treating the session as signed out.
    if (response.status === 401 && typeof window !== "undefined" && !authEndpoint) {
      const refreshedToken = await refreshAccessToken();
      if (refreshedToken) {
        const retryHeaders = new Headers(config.headers);
        retryHeaders.set("Authorization", `Bearer ${refreshedToken}`);
        config.headers = retryHeaders;
        response = await fetch(url, config);
      }
    }

    if (response.status === 401 && typeof window !== "undefined" && !authEndpoint) {
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      if (window.location.pathname !== "/") {
        window.location.href = "/";
      }
    }

    let data;
    try {
      data = await response.json();
    } catch {
      return response;
    }

    if (data && typeof data === "object" && "success" in data) {
      if (data.success) {
        return { ok: response.ok, status: response.status, json: async () => data.data };
      }
      return { ok: false, status: response.status, json: async () => data.error || data };
    }

    return { ok: response.ok, status: response.status, json: async () => data };

  } catch (error) {
    console.error(`Network Error calling ${url}:`, error);
    throw error;
  }
}
