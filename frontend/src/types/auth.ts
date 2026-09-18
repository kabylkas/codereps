export interface User {
  id: string;
  email: string;
  username: string;
  full_name: string;
  role: "admin" | "professor" | "student";
  is_active: boolean;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  username: string;
  password: string;
  full_name: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
}
