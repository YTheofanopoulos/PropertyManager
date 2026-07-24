import { apiRequest } from "../repositories/apiClient";
import { loadAuthCredentials } from "./authSession";

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
        this.session = null;
        return null;
      }
      return this.accept(response);
    } catch {
      this.session = null;
      return null;
    }
  }

  private accept(response: AuthResponse): AuthSession {
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
