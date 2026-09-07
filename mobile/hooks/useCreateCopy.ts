import { useEffect, useRef, useState } from "react";
import { randomUUID } from "expo-crypto";
import {
  ApiError,
  saveCopy,
  type CreateCopy,
  type SavedCopy,
} from "../services/api";

export type CopyInput = Omit<CreateCopy, "acquisition_key" | "allow_duplicate">;
type SaveState =
  | { kind: "editing" }
  | { kind: "saving" }
  | { kind: "duplicate"; message: string }
  | { kind: "error"; message: string }
  | { kind: "saved"; copy: SavedCopy };

export function useCreateCopy() {
  const [state, setState] = useState<SaveState>({ kind: "editing" });
  const pending = useRef<CreateCopy | null>(null);
  const active = useRef<AbortController | null>(null);
  useEffect(
    () => () => {
      active.current?.abort();
      active.current = null;
    },
    [],
  );

  async function send(body: CreateCopy) {
    if (active.current) return; // Synchronous guard against double taps.
    const controller = new AbortController();
    active.current = controller;
    pending.current = body;
    setState({ kind: "saving" });
    const timer = setTimeout(() => controller.abort(), 20000);
    try {
      const copy = await saveCopy(body, controller.signal);
      if (active.current === controller) setState({ kind: "saved", copy });
    } catch (error) {
      if (active.current !== controller) return;
      if (error instanceof ApiError && error.code === "duplicate_copy") {
        setState({ kind: "duplicate", message: error.message });
      } else {
        setState({
          kind: "error",
          message: controller.signal.aborted
            ? "We couldn't confirm whether the save finished. Retry safely to check the same request."
            : error instanceof ApiError
              ? error.message
              : "The save could not be confirmed. Try again.",
        });
      }
    } finally {
      clearTimeout(timer);
      if (active.current === controller) active.current = null;
    }
  }
  function create(input: CopyInput) {
    if (active.current || pending.current) return;
    try {
      void send({
        ...input,
        acquisition_key: randomUUID(),
        allow_duplicate: false,
      });
    } catch {
      setState({
        kind: "error",
        message: "Could not prepare the save. Edit details and try again.",
      });
    }
  }
  function retry() {
    if (pending.current) void send(pending.current);
  }
  function confirmDuplicate() {
    if (pending.current)
      void send({ ...pending.current, allow_duplicate: true });
  }
  function edit() {
    if (active.current) return;
    pending.current = null;
    setState({ kind: "editing" });
  }
  return { state, create, retry, confirmDuplicate, edit };
}
