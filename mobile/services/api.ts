import type { components } from "../types/api.generated";
import { getAuthToken } from "./auth";
export type LookupResult = components["schemas"]["LookupResponse"];
export type CreateCopy = components["schemas"]["CreateCopyRequest"];
export type SavedCopy = components["schemas"]["LibraryCopyResponse"];

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

async function request(
  path: string,
  signal: AbortSignal,
  body?: CreateCopy,
  method?: "POST" | "PATCH" | "DELETE",
): Promise<unknown> {
  const base = process.env.EXPO_PUBLIC_API_URL?.replace(/\/+$/, "");
  if (!base)
    throw new ApiError(
      "configuration",
      "Set EXPO_PUBLIC_API_URL in mobile/.env, then restart Expo.",
    );
  let response: Response;
  try {
    const token = await getAuthToken();
    response = await fetch(`${base}${path}`, {
      signal,
      method: method ?? (body ? "POST" : "GET"),
      headers: {
        ...(body ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body
        ? {
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          }
        : {}),
    });
  } catch (error) {
    if (signal.aborted) throw error;
    throw new ApiError(
      "network",
      "Could not reach Stacks. Check your connection and the backend address.",
    );
  }
  if (response.status === 204) return undefined;
  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new ApiError(
      "invalid_response",
      "The server returned an unreadable response. Try again.",
    );
  }
  if (!response.ok) {
    const failure = payload as Partial<
      components["schemas"]["ErrorResponse"]
    > | null;
    throw new ApiError(
      failure?.error?.code ?? "server_error",
      failure?.error?.message ?? "The request failed. Try again.",
    );
  }
  return payload;
}

export async function lookupISBN(
  isbn: string,
  signal: AbortSignal,
): Promise<LookupResult> {
  const result = (await request(
    `/books/lookup/${encodeURIComponent(isbn)}`,
    signal,
  )) as LookupResult | null;
  if (
    !result?.book?.id ||
    typeof result.book.title !== "string" ||
    !Array.isArray(result.book.authors)
  ) {
    throw new ApiError(
      "invalid_response",
      "The server returned an unexpected response.",
    );
  }
  return result;
}

export async function saveCopy(
  body: CreateCopy,
  signal: AbortSignal,
): Promise<SavedCopy> {
  const copy = (await request(
    "/library/copies",
    signal,
    body,
  )) as SavedCopy | null;
  if (
    !copy?.id ||
    copy.book_edition_id !== body.book_edition_id ||
    copy.acquisition_key !== body.acquisition_key
  ) {
    throw new ApiError(
      "invalid_response",
      "We couldn't verify the saved copy. Retry to check the same save.",
    );
  }
  return copy;
}

export async function updateCopy(
  id: string,
  body: Omit<
    CreateCopy,
    "book_edition_id" | "acquisition_key" | "allow_duplicate"
  >,
  signal: AbortSignal,
): Promise<SavedCopy> {
  return (await request(
    `/library/copies/${id}`,
    signal,
    body as CreateCopy,
    "PATCH",
  )) as SavedCopy;
}

export async function deleteCopy(
  id: string,
  signal: AbortSignal,
): Promise<void> {
  await request(`/library/copies/${id}`, signal, undefined, "DELETE");
}
