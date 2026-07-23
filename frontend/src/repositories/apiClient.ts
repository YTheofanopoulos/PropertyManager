interface ApiErrorPayload {
  error?: string;
  message?: string;
}

function resolveApplicationPath(path: string): string {
  if (!path.startsWith("/api/")) return path;

  const applicationBasePath = window.location.pathname
    .replace(/\/index\.html$/, "")
    .replace(/\/$/, "");

  return `${applicationBasePath}${path}`;
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
  let response: Response;
  try {
    response = await fetch(resolveApplicationPath(path), {
      ...options,
      headers: {
        Accept: "application/json",
        ...(options.body ? { "Content-Type": "application/json" } : {}),
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
    throw new ApiError(
      payload.error ?? payload.message ?? `The request failed (${response.status}).`,
      response.status,
    );
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}
