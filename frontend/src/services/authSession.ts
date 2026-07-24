export interface AuthCredentials {
  username: string;
  token: string;
  remember: boolean;
}

interface SharedAuthToken {
  UserName?: unknown;
  userName?: unknown;
  username?: unknown;
  hash?: unknown;
  remember?: unknown;
}

const PREFERRED_PORTAL_KEYS = ["token", "authToken", "sharedAuth.token"];

function credentialsFromSeparateFields(storage: Storage): AuthCredentials | null {
  const username = storage.getItem("username") ?? storage.getItem("UserName");
  const token = storage.getItem("hash");
  if (!username?.trim() || !token?.trim()) return null;

  return {
    username: username.trim(),
    token: token.trim(),
    remember: storage.getItem("remember") === "true",
  };
}

function credentialsFrom(value: unknown): AuthCredentials | null {
  if (!value || typeof value !== "object") return null;

  const candidate = value as SharedAuthToken & { token?: unknown };
  const nested = candidate.token;
  if (nested && typeof nested === "object") {
    const credentials = credentialsFrom(nested);
    if (credentials) return credentials;
  }

  const username = candidate.UserName ?? candidate.userName ?? candidate.username;
  if (typeof username !== "string" || typeof candidate.hash !== "string") return null;
  if (!username.trim() || !candidate.hash.trim()) return null;

  return {
    username: username.trim(),
    token: candidate.hash.trim(),
    remember: Boolean(candidate.remember),
  };
}

function parseStoredCredentials(value: string | null): AuthCredentials | null {
  if (!value) return null;
  try {
    return credentialsFrom(JSON.parse(value));
  } catch {
    return null;
  }
}

function credentialsFromStorage(storage: Storage): AuthCredentials | null {
  try {
    // The existing SharedAuth portal stores its active session as separate
    // scalar entries: username, hash, and Collections. Only username and hash
    // are credentials; PropertyManager obtains authoritative scope access from
    // the backend instead of trusting the browser's Collections value.
    const separateCredentials = credentialsFromSeparateFields(storage);
    if (separateCredentials) return separateCredentials;

    for (const key of PREFERRED_PORTAL_KEYS) {
      const credentials = parseStoredCredentials(storage.getItem(key));
      if (credentials) return credentials;
    }

    // SharedAuth owns the storage key. Scanning the remaining same-origin
    // entries keeps PropertyManager compatible if the portal renames that key
    // while preserving the established token payload.
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index);
      if (!key || PREFERRED_PORTAL_KEYS.includes(key)) continue;
      const credentials = parseStoredCredentials(storage.getItem(key));
      if (credentials) return credentials;
    }
  } catch {
    // Browser privacy settings can disable storage. That is equivalent to
    // having no portal session, so startup returns to the main page.
  }
  return null;
}

export function loadAuthCredentials(): AuthCredentials | null {
  // Remembered portal sessions live in localStorage; browser-session tokens
  // may instead live in sessionStorage.
  return credentialsFromStorage(localStorage) ?? credentialsFromStorage(sessionStorage);
}
