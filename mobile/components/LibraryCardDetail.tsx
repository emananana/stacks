import { useTheme, useThemedStyles } from "../theme/ThemeProvider";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  SafeAreaProvider,
  SafeAreaView,
  initialWindowMetrics,
} from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import * as Haptics from "expo-haptics";
import { deleteCopy, updateCopy, type LibraryItem } from "../services/library";
import { type Colors, mono, serif } from "../theme/tokens";
import BookJacket from "./BookJacket";

export default function LibraryCardDetail({
  item,
  onClose,
  onChanged,
}: {
  item: LibraryItem;
  onClose: () => void;
  onChanged: () => void;
}) {
  const { colors: c, isDark } = useTheme();
  const s = useThemedStyles(styles);
  const [draft, setDraft] = useState(item);
  const [saved, setSaved] = useState(item);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [confirm, setConfirm] = useState<"delete" | "discard" | null>(null);
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);
  function change(patch: Partial<LibraryItem>) {
    setDraft((current) => ({ ...current, ...patch }));
    setMessage(null);
    setSuccess(false);
  }
  function close() {
    if (!busy) {
      if (dirty) setConfirm("discard");
      else onClose();
    }
  }
  async function save() {
    setBusy(true);
    setMessage(null);
    setSuccess(false);
    try {
      const result = await updateCopy(
        item.id,
        {
          reading_status: draft.reading_status,
          rating: draft.rating,
          shelf: draft.shelf,
          date_acquired: draft.date_acquired,
          notes: draft.notes,
        },
        new AbortController().signal,
      );
      const updated = { ...draft, ...result };
      setDraft(updated);
      setSaved(updated);
      setSuccess(true);
      onChanged();
      void Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Success,
      ).catch(() => {});
    } catch (e) {
      setMessage(
        e instanceof Error ? e.message : "Could not save your changes.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    setBusy(true);
    setMessage(null);
    try {
      await deleteCopy(item.id, new AbortController().signal);
      onChanged();
      onClose();
    } catch (e) {
      setMessage(
        e instanceof Error ? e.message : "Could not remove this copy.",
      );
      setConfirm(null);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={close}
    >
      <SafeAreaProvider initialMetrics={initialWindowMetrics} style={s.safe}>
        <StatusBar style={isDark ? "light" : "dark"} />
        <SafeAreaView edges={["top", "bottom", "left", "right"]} style={s.safe}>
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
          >
            <View style={s.toolbar}>
              <Pressable
                accessibilityRole="button"
                disabled={busy}
                onPress={close}
                style={s.back}
              >
                <Text style={s.backText}>← My library</Text>
              </Pressable>
              <Text style={s.brand}>stacks.</Text>
            </View>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={s.content}
            >
              <View style={s.topline}>
                <Text style={s.kicker}>PERSONAL LIBRARY CARD</Text>
                <Text style={s.kicker}>
                  NO. {item.id.slice(0, 6).toUpperCase()}
                </Text>
              </View>
              <View style={s.bookHeader}>
                <BookJacket title={item.title} cover={item.cover_url} small />
                <View style={{ flex: 1 }}>
                  <Text accessibilityRole="header" style={s.title}>
                    {item.title}
                  </Text>
                  <Text style={s.author}>
                    {item.authors.join(", ") || "Author unknown"}
                  </Text>
                </View>
              </View>
              <View style={s.isbn}>
                <Text style={s.kicker}>ISBN 13</Text>
                <Text selectable style={s.isbnText}>
                  {item.isbn13}
                </Text>
              </View>
              <Text style={s.sectionTitle}>Your chapter with this book</Text>
              <Text style={s.label}>Reading status</Text>
              <View style={s.choices}>
                {(
                  [
                    ["unread", "To read"],
                    ["reading", "Reading"],
                    ["read", "Read"],
                  ] as const
                ).map(([value, label]) => (
                  <Pressable
                    key={value}
                    disabled={busy}
                    accessibilityRole="radio"
                    accessibilityState={{
                      checked: draft.reading_status === value,
                    }}
                    onPress={() => change({ reading_status: value })}
                    style={[
                      s.choice,
                      draft.reading_status === value && s.chosen,
                    ]}
                  >
                    <Text
                      style={[
                        s.choiceText,
                        draft.reading_status === value && { color: c.onAccent },
                      ]}
                    >
                      {label}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <Text style={s.label}>Your rating</Text>
              <View style={s.rating}>
                {[1, 2, 3, 4, 5].map((rating) => (
                  <Pressable
                    key={rating}
                    accessibilityRole="button"
                    accessibilityLabel={`Rate ${rating} out of 5${draft.rating === rating ? ", selected; tap to clear" : ""}`}
                    disabled={busy}
                    onPress={() =>
                      change({
                        rating: draft.rating === rating ? null : rating,
                      })
                    }
                    style={s.ratingButton}
                  >
                    <Text style={s.star}>
                      {(draft.rating ?? 0) >= rating ? "★" : "☆"}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <Text style={s.label}>Where it lives</Text>
              <TextInput
                accessibilityLabel="Shelf or location"
                editable={!busy}
                maxLength={120}
                value={draft.shelf ?? ""}
                onChangeText={(shelf) => change({ shelf })}
                placeholder="The bedside pile, perhaps?"
                placeholderTextColor={c.muted}
                style={s.input}
              />
              <Text style={s.label}>Date acquired · YYYY-MM-DD</Text>
              <TextInput
                accessibilityLabel="Date acquired, YYYY-MM-DD"
                editable={!busy}
                maxLength={10}
                value={draft.date_acquired ?? ""}
                onChangeText={(date) => change({ date_acquired: date || null })}
                placeholder="e.g. 2026-09-07"
                placeholderTextColor={c.muted}
                style={s.input}
                autoCorrect={false}
              />
              <Text style={s.label}>Notes in the margins</Text>
              <TextInput
                accessibilityLabel="Personal notes"
                editable={!busy}
                maxLength={10000}
                multiline
                value={draft.notes ?? ""}
                onChangeText={(notes) => change({ notes })}
                placeholder="A favorite line. Who gave it to you. Why you kept it."
                placeholderTextColor={c.muted}
                style={[s.input, s.notes]}
              />
              {message && (
                <Text accessibilityRole="alert" style={s.error}>
                  {message}
                </Text>
              )}
              {success && (
                <View accessibilityLiveRegion="polite" style={s.stamp}>
                  <Text style={s.stampText}>✓ SAFELY ON YOUR SHELF</Text>
                </View>
              )}
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ disabled: busy || !dirty }}
                disabled={busy || !dirty}
                onPress={() => void save()}
                style={[s.save, (busy || !dirty) && { opacity: 0.55 }]}
              >
                <Text style={s.saveText}>
                  {busy ? "One moment…" : "Save my changes"}
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                disabled={busy}
                onPress={() => setConfirm("delete")}
                style={s.remove}
              >
                <Text style={s.removeText}>Remove this copy</Text>
              </Pressable>
              <Text style={s.footer}>Part of your story. Kept in Stacks.</Text>
            </ScrollView>
            {confirm && (
              <View style={s.confirmOverlay}>
                <View accessibilityViewIsModal style={s.confirmCard}>
                  <Text style={s.sectionTitle}>
                    {confirm === "delete"
                      ? "Let this copy go?"
                      : "Leave without saving?"}
                  </Text>
                  <Text style={s.author}>
                    {confirm === "delete"
                      ? "This removes this physical copy and its personal notes from your library."
                      : "Your changes to this card will be discarded."}
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    disabled={busy}
                    onPress={() =>
                      confirm === "delete" ? void remove() : onClose()
                    }
                    style={s.save}
                  >
                    <Text style={s.saveText}>
                      {busy
                        ? "Removing…"
                        : confirm === "delete"
                          ? "Remove copy"
                          : "Discard changes"}
                    </Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    disabled={busy}
                    onPress={() => setConfirm(null)}
                    style={s.remove}
                  >
                    <Text style={s.backText}>Keep it here</Text>
                  </Pressable>
                </View>
              </View>
            )}
          </KeyboardAvoidingView>
        </SafeAreaView>
      </SafeAreaProvider>
    </Modal>
  );
}
const styles = (c: Colors) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.background },
    toolbar: {
      paddingHorizontal: 20,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      borderBottomWidth: 1,
      borderColor: c.border,
    },
    back: { minHeight: 56, justifyContent: "center", paddingRight: 16 },
    backText: { fontSize: 14, color: c.text },
    brand: {
      fontFamily: serif,
      fontSize: 27,
      color: c.text,
      letterSpacing: -1,
    },
    content: {
      padding: 24,
      width: "100%",
      maxWidth: 680,
      alignSelf: "center",
      paddingBottom: 30,
    },
    topline: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
    kicker: {
      fontFamily: mono,
      fontSize: 8,
      letterSpacing: 0.7,
      color: c.muted,
    },
    bookHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 20,
      marginVertical: 25,
    },
    title: { fontFamily: serif, fontSize: 25, lineHeight: 30, color: c.text },
    author: { fontSize: 14, lineHeight: 21, color: c.muted, marginTop: 8 },
    isbn: {
      borderTopWidth: 1,
      borderBottomWidth: 1,
      borderColor: c.border,
      paddingVertical: 14,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    isbnText: { fontFamily: mono, fontSize: 12, color: c.text },
    sectionTitle: {
      fontFamily: serif,
      fontSize: 23,
      color: c.text,
      marginTop: 24,
    },
    label: { fontSize: 12, color: c.muted, marginTop: 23, marginBottom: 10 },
    choices: { flexDirection: "row", gap: 8 },
    choice: {
      flex: 1,
      minHeight: 46,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 4,
    },
    chosen: { backgroundColor: c.accent, borderColor: c.accent },
    choiceText: { color: c.text, fontSize: 13 },
    rating: { flexDirection: "row" },
    ratingButton: {
      minWidth: 46,
      minHeight: 46,
      alignItems: "center",
      justifyContent: "center",
    },
    star: { color: c.accent, fontSize: 31 },
    input: {
      borderBottomWidth: 1,
      borderColor: c.border,
      color: c.text,
      fontSize: 15,
      paddingVertical: 12,
      minHeight: 48,
    },
    notes: {
      minHeight: 115,
      textAlignVertical: "top",
      lineHeight: 25,
      fontFamily: serif,
      fontSize: 17,
    },
    save: {
      marginTop: 24,
      minHeight: 50,
      padding: 14,
      backgroundColor: c.accent,
      borderRadius: 4,
      alignItems: "center",
      justifyContent: "center",
    },
    saveText: { color: c.onAccent, fontSize: 15, fontWeight: "600" },
    remove: {
      minHeight: 48,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 8,
    },
    removeText: { fontSize: 13, color: c.error },
    footer: {
      fontFamily: serif,
      fontStyle: "italic",
      color: c.muted,
      fontSize: 13,
      textAlign: "center",
      marginTop: 15,
    },
    error: { color: c.error, marginTop: 16, lineHeight: 21 },
    stamp: {
      borderWidth: 1,
      borderColor: c.accent,
      alignSelf: "center",
      padding: 10,
      marginTop: 22,
      transform: [{ rotate: "-2deg" }],
    },
    stampText: {
      fontFamily: mono,
      fontSize: 10,
      letterSpacing: 1,
      color: c.accent,
    },
    confirmOverlay: {
      position: "absolute",
      top: 0,
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: "#121615BB",
      justifyContent: "center",
      padding: 24,
    },
    confirmCard: {
      backgroundColor: c.background,
      padding: 24,
      borderRadius: 6,
      maxWidth: 440,
      width: "100%",
      alignSelf: "center",
    },
  });
