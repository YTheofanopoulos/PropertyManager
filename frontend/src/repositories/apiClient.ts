import { loadAuthCredentials } from "../services/authSession";

interface ApiErrorPayload {
  error?: string;
  message?: string;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const credentials = loadAuthCredentials();
  let response: Response;
  try {
    response = await fetch(path, {
      ...options,
      headers: {
        Accept: "application/json",
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...(credentials ? {
          "X-PM-Username": credentials.username,
          "X-PM-Token": credentials.token,
        } : {}),
        ...options.headers,
      },
    });
  } catch {
    throw new ApiError(
      "The PropertyManager backend could not be reached. Confirm that the development services are running.",
      0,
    );
  }

  if (!response.ok) {
    let payload: ApiErrorPayload = {};
    try {
      payload = (await response.json()) as ApiErrorPayload;
    } catch {
      // A proxy or server may return a non-JSON error page.
    }
    if (response.status === 401) {
      window.dispatchEvent(new CustomEvent("pm:authentication-required"));
    }
    throw new ApiError(
      payload.error ?? payload.message ?? `The request failed (${response.status}).`,
      response.status,
    );
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}
