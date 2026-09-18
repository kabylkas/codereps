export interface User {
  id: string;
  email: string;
  full_name: string;
  role: "admin" | "professor" | "student";
  position: string | null;
  is_active: boolean;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  full_name: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
}
