import { API_BASE_URL } from "./config";

type JsonBody = Record<string, unknown>;

async function request<T>(
  path: string,
  options: {
    method?: "GET" | "POST";
    token?: string | null;
    body?: JsonBody;
  } = {},
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;
    try {
      const payload = (await response.json()) as { detail?: string };
      if (payload.detail) {
        message = payload.detail;
      }
    } catch {
      // Keep default message when body is not JSON.
    }
    throw new Error(message);
  }
  return (await response.json()) as T;
}

export const api = { request };
