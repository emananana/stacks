import { ApiError, deleteCopy, type SavedCopy, updateCopy } from "./api";
import { getAuthToken } from "./auth";
export type LibraryItem = SavedCopy & {
  title: string;
  authors: string[];
  cover_url: string | null;
  isbn13: string;
};
export type LibraryResponse = {
  items: LibraryItem[];
  total: number;
  books_owned: number;
  books_read: number;
  currently_reading: number;
  unread: number;
};
export async function getLibrary(
  signal: AbortSignal,
  query = "",
  status = "",
  sort = "recent",
): Promise<LibraryResponse> {
  const base = process.env.EXPO_PUBLIC_API_URL?.replace(/\/+$/, "");
  if (!base)
    throw new ApiError(
      "configuration",
      "Set EXPO_PUBLIC_API_URL in mobile/.env, then restart Expo.",
    );
  const params = new URLSearchParams({ sort });
  if (query) params.set("query", query);
  if (status) params.set("status", status);
  const token = await getAuthToken();
  const response = await fetch(`${base}/library/copies?${params}`, {
    signal,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  const payload = await response.json();
  if (!response.ok)
    throw new ApiError(
      payload?.error?.code ?? "server_error",
      payload?.error?.message ?? "Could not load your library.",
    );
  return payload as LibraryResponse;
}

export { deleteCopy, updateCopy };
