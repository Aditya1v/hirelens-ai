// ------------------------------------------------------------
// apiClient.ts
//
// Every backend call in HireLens goes through here. Centralizing this means:
//   - `credentials: "include"` is never forgotten (required for the httpOnly
//     auth cookie to be sent, since frontend and backend run on different
//     ports/origins in dev).
//   - The backend's { success, data } / { success:false, message } envelope
//     is unwrapped once, so callers just get data or a thrown Error.

const API_BASE = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

function buildUrl(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE}${normalizedPath}`;
}

async function handle<T>(res: Response): Promise<T> {
  const contentType = res.headers.get("content-type") || "";

  let body: any = null;

  if (contentType.includes("application/json")) {
    try {
      body = await res.json();
    } catch {
      body = null;
    }
  }

  if (!res.ok) {
    throw new ApiError(
      body?.message || body?.error?.message || `Request failed (${res.status})`,
      res.status,
    );
  }

  return (body?.data ?? null) as T;
}

/**
 * GET request.
 * Authentication cookie is automatically included.
 */
export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(buildUrl(path), {
    method: "GET",
    credentials: "include",
    headers: {
      Accept: "application/json",
    },
  });

  return handle<T>(res);
}

/**
 * POST / PUT / PATCH / DELETE JSON request.
 */
export async function apiSend<T>(
  path: string,
  method: "POST" | "PUT" | "PATCH" | "DELETE",
  body?: unknown,
): Promise<T> {
  const res = await fetch(buildUrl(path), {
    method,
    credentials: "include",
    headers: {
      Accept: "application/json",
      ...(body !== undefined
        ? {
            "Content-Type": "application/json",
          }
        : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  return handle<T>(res);
}

/**
 * Multipart upload.
 *
 * Do NOT manually set Content-Type here.
 * Browser must generate the multipart boundary.
 * Multipart form-data upload (resume PDF + preview image).
 */
export async function apiUpload<T>(
  path: string,
  formData: FormData,
): Promise<T> {
  const res = await fetch(buildUrl(path), {
    method: "POST",
    credentials: "include",
    body: formData,
  });

  return handle<T>(res);
}

/**
/** Fetches an authenticated file (PDF/preview image) as an object URL. 
 * Fetch authenticated files as object URLs. 
 */
export async function apiFetchBlobUrl(path: string): Promise<string> {
  const res = await fetch(buildUrl(path), {
    method: "GET",
    credentials: "include",
  });

  if (!res.ok) {
    throw new ApiError(`Failed to load file (${res.status})`, res.status);
  }

  const blob = await res.blob();

  return URL.createObjectURL(blob);
}

export { API_BASE };
