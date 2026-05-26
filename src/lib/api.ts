"use client";

import axios, { AxiosError, AxiosInstance } from "axios";

const baseURL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export const api: AxiosInstance = axios.create({
  baseURL: `${baseURL}/api`,
  timeout: 60_000,
});

const TOKEN_KEY = "vi.token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (error: AxiosError) => {
    if (error.response?.status === 401 && typeof window !== "undefined") {
      const path = window.location.pathname;
      if (path !== "/login" && path !== "/") {
        setToken(null);
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  },
);

export function describeError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const detail = error.response?.data;
    if (typeof detail === "string") return detail;
    if (detail && typeof detail === "object") {
      if ("detail" in detail) {
        const d = (detail as { detail: unknown }).detail;
        if (typeof d === "string") return d;
        if (d && typeof d === "object" && "message" in d) {
          return String((d as { message: unknown }).message);
        }
        return JSON.stringify(d);
      }
    }
    return error.message;
  }
  if (error instanceof Error) return error.message;
  return "Something went wrong";
}
