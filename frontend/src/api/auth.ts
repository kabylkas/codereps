import client from "./client";
import type { LoginRequest, RegisterRequest, TokenResponse, User } from "../types/auth";

export async function login(data: LoginRequest): Promise<TokenResponse> {
  const formData = new URLSearchParams();
  formData.append("username", data.username);
  formData.append("password", data.password);
  const res = await client.post("/auth/login", formData, {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });
  return res.data;
}

export async function register(data: RegisterRequest): Promise<User> {
  const res = await client.post("/auth/register", data);
  return res.data;
}

export async function getMe(): Promise<User> {
  const res = await client.get("/auth/me");
  return res.data;
}
