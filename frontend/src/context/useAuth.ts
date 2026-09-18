import { createContext, useContext } from "react";
import type { User } from "../types/auth";

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  isAuthenticated: boolean;
}

// Kept in its own module (no component exports) so editing the provider does
// not break React Fast Refresh — a file mixing component and non-component
// exports gets invalidated instead of hot-reloaded, which remounts consumers
// without the provider and throws the error below.
export const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
