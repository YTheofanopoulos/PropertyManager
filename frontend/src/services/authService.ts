import { apiRequest } from "../repositories/apiClient";
import {
  clearAuthCredentials,
  loadAuthCredentials,
  saveAuthCredentials,
} from "./authSession";

export interface AuthSession {
  username: string;
  globalLevel: number;
  scope: string;
  scopeLevel: number;
  canRead: boolean;
  canWrite: boolean;
  administrator: boolean;
}

interface AuthResponse {
  token: {
    hash: string;
    userName: string;
    remember: number;
    level: number;
    collections: Record<string, number>;
  };
  authorization: {
    scope: string;
    scopeLevel: number;
    canRead: boolean;
    canWrite: boolean;
    administrator: boolean;
  };
}

class AuthService {
  private session: AuthSession | null = null;

  current(): AuthSession | null {
    return this.session;
  }

  async restore(): Promise<AuthSession | null> {
    if (!loadAuthCredentials()) return null;
    try {
      const response = await apiRequest<AuthResponse>("/api/v1/auth/session");
      if (!response.authorization.canRead) {
        clearAuthCredentials();
        this.session = null;
        return null;
      }
      return this.accept(response, false);
    } catch {
      clearAuthCredentials();
      this.session = null;
      return null;
    }
  }

  async login(username: string, password: string, remember: boolean): Promise<AuthSession> {
    const response = await apiRequest<AuthResponse>("/api/v1/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password, remember }),
    });
    return this.accept(response, true);
  }

  async logout(): Promise<void> {
    try {
      await apiRequest<void>("/api/v1/auth/logout", { method: "POST" });
    } finally {
      clearAuthCredentials();
      this.session = null;
    }
  }

  private accept(response: AuthResponse, persistToken: boolean): AuthSession {
    if (persistToken) {
      saveAuthCredentials({
        username: response.token.userName,
        token: response.token.hash,
        remember: Boolean(response.token.remember),
      });
    }
    this.session = {
      username: response.token.userName,
      globalLevel: response.token.level,
      scope: response.authorization.scope,
      scopeLevel: response.authorization.scopeLevel,
      canRead: response.authorization.canRead,
      canWrite: response.authorization.canWrite,
      administrator: response.authorization.administrator,
    };
    return this.session;
  }
}

export const authService = new AuthService();
