import axios from "axios";

// 127.0.0.1, not localhost: on macOS "localhost" resolves to ::1 first, and
// Docker Desktop binds *:8000 on IPv6 — so "localhost:8000" reaches Docker's
// API server (404) instead of uvicorn, which listens on IPv4 only.
const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api";

const client = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
});

client.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("access_token");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default client;
