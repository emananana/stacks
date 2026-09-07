import { useEffect, useRef, useState } from "react";
import { ApiError, lookupISBN, type LookupResult } from "../services/api";

type LookupState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "success"; result: LookupResult }
  | { kind: "error"; message: string };

export function useLookup() {
  const [state, setState] = useState<LookupState>({ kind: "idle" });
  const active = useRef<AbortController | null>(null);
  useEffect(
    () => () => {
      active.current?.abort();
      active.current = null;
    },
    [],
  );
  function reset() {
    active.current?.abort();
    active.current = null;
    setState({ kind: "idle" });
  }
  async function submit(raw: string) {
    active.current?.abort();
    const controller = new AbortController();
    active.current = controller;
    const isbn = raw.trim();
    if (!isbn) {
      setState({
        kind: "error",
        message: "Enter the ISBN printed on your book.",
      });
      return;
    }
    setState({ kind: "loading" });
    const timer = setTimeout(() => controller.abort(), 20000);
    try {
      const result = await lookupISBN(isbn, controller.signal);
      if (active.current === controller) setState({ kind: "success", result });
    } catch (error) {
      if (active.current !== controller) return;
      setState({
        kind: "error",
        message: controller.signal.aborted
          ? "Lookup took too long. Check your connection and try again."
          : error instanceof ApiError
            ? error.message
            : "Something went wrong. Try again.",
      });
    } finally {
      clearTimeout(timer);
    }
  }
  return { state, submit, reset };
}
