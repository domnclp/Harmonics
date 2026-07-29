import { supabase } from "./supabase";

const normalizeEnvUrl = (value: string) => {
  // Tolerates a pasted "KEY=value" and strips trailing slashes.
  const trimmed = value.trim().replace(/^[A-Z0-9_]+=/, "").replace(/\/+$/, "");
  if (!trimmed) return trimmed;

  // A scheme-less host is treated by fetch() as a relative path, so requests
  // silently hit the web origin and the SPA fallback returns HTML that then
  // fails to parse as JSON. Assume https rather than fail this obscurely.
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `${trimmed.startsWith("localhost") ? "http" : "https"}://${trimmed}`;
};

export const API_URL = normalizeEnvUrl(import.meta.env.VITE_API_URL ?? "http://localhost:4000");

type ApiOptions = Omit<RequestInit, "body"> & {
  body?: BodyInit | Record<string, unknown> | Record<string, unknown>[];
};

export async function apiFetch<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 15_000);

  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  try {
    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers,
      signal: options.signal ?? controller.signal,
      body: options.body && typeof options.body !== "string" ? JSON.stringify(options.body) : options.body
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: "Request failed" }));
      throw new Error(`${response.status}: ${error.message ?? "Request failed"}`);
    }

    if (response.status === 204) return undefined as T;
    return response.json() as Promise<T>;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error(`Timed out calling ${API_URL}${path}`);
    }
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}
