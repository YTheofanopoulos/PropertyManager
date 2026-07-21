export interface AuthCredentials {
  username: string;
  token: string;
  remember: boolean;
}

const STORAGE_KEY = "propertyManager.auth";

export function loadAuthCredentials(): AuthCredentials | null {
  for (const storage of [localStorage, sessionStorage]) {
    try {
      const value = storage.getItem(STORAGE_KEY);
      if (!value) continue;
      const parsed = JSON.parse(value) as AuthCredentials;
      if (parsed.username && parsed.token) return parsed;
    } catch {
      storage.removeItem(STORAGE_KEY);
    }
  }
  return null;
}

export function saveAuthCredentials(credentials: AuthCredentials): void {
  clearAuthCredentials();
  const storage = credentials.remember ? localStorage : sessionStorage;
  storage.setItem(STORAGE_KEY, JSON.stringify(credentials));
}

export function clearAuthCredentials(): void {
  localStorage.removeItem(STORAGE_KEY);
  sessionStorage.removeItem(STORAGE_KEY);
}
