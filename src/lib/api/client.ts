// src/lib/api/client.ts
// Centralized API client with consistent error handling

const API_BASE = "https://backend-rxsn.onrender.com";
const IS_DEV = __DEV__;

// Custom error class for API errors
export class ApiError extends Error {
  status: number;
  code: "NETWORK" | "SERVER" | "PARSE" | "UNKNOWN";

  constructor(
    message: string,
    status: number = 0,
    code: "NETWORK" | "SERVER" | "PARSE" | "UNKNOWN" = "UNKNOWN"
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

// Logger that only logs in development
const logger = {
  log: IS_DEV ? console.log : () => {},
  warn: IS_DEV ? console.warn : () => {},
  error: console.error, // Always log errors
};

// Build full URL from path
function buildUrl(path: string, queryParams?: Record<string, string>): string {
  const base = API_BASE.replace(/\/+$/, "");
  const url = new URL(`${base}${path}`);

  if (queryParams) {
    Object.entries(queryParams).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, value);
      }
    });
  }

  return url.toString();
}

// Parse JSON response with error handling
async function parseJsonResponse<T>(response: Response): Promise<T> {
  const text = await response.text();

  if (!response.ok) {
    logger.warn(`API error ${response.status}: ${text}`);
    throw new ApiError(
      text || `Request failed with status ${response.status}`,
      response.status,
      "SERVER"
    );
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    logger.error("Failed to parse JSON:", text);
    throw new ApiError("Invalid JSON response from server", response.status, "PARSE");
  }
}

// Request options type
type RequestOptions = {
  headers?: Record<string, string>;
  timeout?: number;
};

// Base request function with timeout support
async function request<T>(
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
  path: string,
  options?: {
    body?: Record<string, unknown>;
    queryParams?: Record<string, string>;
    headers?: Record<string, string>;
    timeout?: number;
  }
): Promise<T> {
  const { body, queryParams, headers = {}, timeout = 30000 } = options || {};
  const url = buildUrl(path, queryParams);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  logger.log(`[API] ${method} ${path}`, body ? { body } : "");

  try {
    const response = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    return await parseJsonResponse<T>(response);
  } catch (error: any) {
    if (error.name === "AbortError") {
      throw new ApiError("Request timed out", 0, "NETWORK");
    }
    if (error instanceof ApiError) {
      throw error;
    }
    // Network error (no internet, DNS failure, etc.)
    throw new ApiError(
      error.message || "Network request failed",
      0,
      "NETWORK"
    );
  } finally {
    clearTimeout(timeoutId);
  }
}

// FormData upload (for audio files)
async function uploadFormData<T>(
  path: string,
  formData: FormData,
  options?: {
    queryParams?: Record<string, string>;
    timeout?: number;
  }
): Promise<T> {
  const { queryParams, timeout = 60000 } = options || {}; // Longer timeout for uploads
  const url = buildUrl(path, queryParams);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  logger.log(`[API] UPLOAD ${path}`);

  try {
    const response = await fetch(url, {
      method: "POST",
      // Don't set Content-Type - fetch sets it automatically with boundary for FormData
      body: formData,
      signal: controller.signal,
    });

    return await parseJsonResponse<T>(response);
  } catch (error: any) {
    if (error.name === "AbortError") {
      throw new ApiError("Upload timed out", 0, "NETWORK");
    }
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(
      error.message || "Upload failed",
      0,
      "NETWORK"
    );
  } finally {
    clearTimeout(timeoutId);
  }
}

// Exported API client
export const api = {
  get: <T>(path: string, options?: RequestOptions & { queryParams?: Record<string, string> }) =>
    request<T>("GET", path, options),

  post: <T>(path: string, body?: Record<string, unknown>, options?: RequestOptions & { queryParams?: Record<string, string> }) =>
    request<T>("POST", path, { ...options, body }),

  put: <T>(path: string, body?: Record<string, unknown>, options?: RequestOptions) =>
    request<T>("PUT", path, { ...options, body }),

  patch: <T>(path: string, body?: Record<string, unknown>, options?: RequestOptions) =>
    request<T>("PATCH", path, { ...options, body }),

  delete: <T>(path: string, options?: RequestOptions) =>
    request<T>("DELETE", path, options),

  upload: <T>(path: string, formData: FormData, options?: { queryParams?: Record<string, string>; timeout?: number }) =>
    uploadFormData<T>(path, formData, options),
};

export default api;
