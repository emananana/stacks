import * as SecureStore from "expo-secure-store";
import { ApiError } from "./api";

export type User = { id: string; email: string };
export type Session = {
  access_token: string;
  token_type: "bearer";
  expires_at: string;
  user: User;
};
const tokenKey = "stacks.access-token";
const baseUrl = () => {
  const base = process.env.EXPO_PUBLIC_API_URL?.replace(/\/+$/, "");
  if (!base)
    throw new ApiError(
      "configuration",
      "Set EXPO_PUBLIC_API_URL in mobile/.env, then restart Expo.",
    );
  return base;
};
async function request(
  path: string,
  body?: { email: string; password: string },
  token?: string,
) {
  let response: Response;
  try {
    response = await fetch(`${baseUrl()}${path}`, {
      method: body ? "POST" : "GET",
      headers: {
        ...(body ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
  } catch {
    throw new ApiError(
      "network",
      "Could not reach Stacks. Check your connection and backend address.",
    );
  }
  if (response.status === 204) return undefined;
  const payload = await response.json().catch(() => null);
  if (!response.ok)
    throw new ApiError(
      payload?.error?.code ?? "server_error",
      payload?.error?.message ?? "The request failed. Try again.",
    );
  return payload as Session | User;
}
export async function register(email: string, password: string) {
  const session = (await request("/auth/register", {
    email,
    password,
  })) as Session;
  await SecureStore.setItemAsync(tokenKey, session.access_token);
  return session;
}
export async function login(email: string, password: string) {
  const session = (await request("/auth/login", {
    email,
    password,
  })) as Session;
  await SecureStore.setItemAsync(tokenKey, session.access_token);
  return session;
}
export async function restoreSession(): Promise<Session | null> {
  const token = await SecureStore.getItemAsync(tokenKey);
  if (!token) return null;
  try {
    const user = (await request("/auth/me", undefined, token)) as User;
    return { access_token: token, token_type: "bearer", expires_at: "", user };
  } catch {
    await SecureStore.deleteItemAsync(tokenKey);
    return null;
  }
}
export async function logout() {
  const token = await SecureStore.getItemAsync(tokenKey);
  if (token)
    await request("/auth/logout", undefined, token).catch(() => undefined);
  await SecureStore.deleteItemAsync(tokenKey);
}
export async function getAuthToken() {
  return SecureStore.getItemAsync(tokenKey);
}
