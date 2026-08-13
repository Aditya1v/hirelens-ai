// ---------------------------------------------------------------------------
// apiClient.ts
//
// Every backend call in HireLens goes through here. Centralizing this means:
//   - `credentials: "include"` is never forgotten (required for the httpOnly
//     auth cookie to be sent, since frontend and backend run on different
//     ports/origins in dev).
//   - The backend's { success, data } / { success:false, message } envelope
//     is unwrapped once, so callers just get data or a thrown Error.
// ---------------------------------------------------------------------------

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function handle<T>(res: Response): Promise<T> {
  const contentType = res.headers.get("content-type") || "";
  const body = contentType.includes("application/json") ? await res.json() : null;

  if (!res.ok) {
    throw new ApiError(body?.message || `Request failed (${res.status})`, res.status);
  }
  return (body?.data ?? null) as T;
}

/** GET request, JSON response, cookies included. */
export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, { credentials: "include" });
  return handle<T>(res);
}

/** POST/PUT/PATCH with a JSON body. */
export async function apiSend<T>(
  path: string,
  method: "POST" | "PUT" | "PATCH" | "DELETE",
  body?: unknown
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    credentials: "include",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  return handle<T>(res);
}

/** Multipart form-data upload (resume PDF + preview image). */
export async function apiUpload<T>(path: string, formData: FormData): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    credentials: "include",
    body: formData,
  });
  return handle<T>(res);
}

/** Fetches an authenticated file (PDF/preview image) as an object URL. */
export async function apiFetchBlobUrl(path: string): Promise<string> {
  const res = await fetch(`${API_BASE}${path}`, { credentials: "include" });
  if (!res.ok) throw new ApiError(`Failed to load file (${res.status})`, res.status);
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}

export { API_BASE };
