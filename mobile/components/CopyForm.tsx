import { useTheme, useThemedStyles } from "../theme/ThemeProvider";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useCreateCopy } from "../hooks/useCreateCopy";
import { type Colors, mono } from "../theme/tokens";

type Status = "unread" | "reading" | "read";
const statuses: { value: Status; label: string }[] = [
  { value: "unread", label: "Unread" },
  { value: "reading", label: "Reading" },
  { value: "read", label: "Read" },
];

function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T12:00:00Z`);
  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value &&
    value.slice(0, 4) !== "0000"
  );
}

export function CopyForm({
  editionId,
  onBusyChange,
  onDone,
}: {
  editionId: string;
  onBusyChange: (busy: boolean) => void;
  onDone: () => void;
}) {
  const { colors: c } = useTheme();
  const s = useThemedStyles(styles);
  const [status, setStatus] = useState<Status>("unread");
  const [rating, setRating] = useState<number | null>(null);
  const [shelf, setShelf] = useState("");
  const [date, setDate] = useState("");
  const [notes, setNotes] = useState("");
  const [validation, setValidation] = useState<string | null>(null);
  const save = useCreateCopy();
  const busy = save.state.kind === "saving";
  const editable = save.state.kind === "editing";
  useEffect(() => {
    onBusyChange(busy);
    return () => onBusyChange(false);
  }, [busy, onBusyChange]);
  function submit() {
    Keyboard.dismiss();
    if (date.trim() && !validDate(date.trim())) {
      setValidation(
        "Enter a real date in YYYY-MM-DD format, or leave it blank.",
      );
      return;
    }
    setValidation(null);
    save.create({
      book_edition_id: editionId,
      reading_status: status,
      rating,
      shelf: shelf.trim() || null,
      date_acquired: date.trim() || null,
      notes: notes.trim() || null,
    });
  }

  if (save.state.kind === "saved") {
    const copy = save.state.copy;
    const details = [
      ["STATUS", statuses.find((s) => s.value === copy.reading_status)?.label],
      ["RATING", copy.rating ? `${copy.rating} / 5` : "Unrated"],
      ["SHELF", copy.shelf || "Not assigned"],
      ["ACQUIRED", copy.date_acquired || "Not recorded"],
    ];
    return (
      <View style={s.section} accessibilityLiveRegion="polite">
        <Text style={s.kicker}>● ARCHIVE ENTRY ADDED</Text>
        <Text accessibilityRole="header" style={s.heading}>
          This copy is yours.
        </Text>
        <Text style={s.help}>
          Saved to your library. Your details stay with this physical copy.
        </Text>
        {details.map(([label, value]) => (
          <View key={label} style={s.receiptRow}>
            <Text style={s.label}>{label}</Text>
            <Text style={s.receiptValue}>{value}</Text>
          </View>
        ))}
        {copy.notes ? (
          <Text selectable style={s.savedNotes}>
            {copy.notes}
          </Text>
        ) : null}
        <Text style={s.help}>
          Library browsing is coming next. This copy is already stored.
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={onDone}
          style={s.primary}
        >
          <Text style={s.primaryText}>Look up another book ↗</Text>
        </Pressable>
      </View>
    );
  }
  return (
    <View style={s.section}>
      <Text style={s.kicker}>YOUR PHYSICAL COPY</Text>
      <Text accessibilityRole="header" style={s.heading}>
        Make it part of your library.
      </Text>
      <Text style={s.help}>
        Review the edition above, then add your personal details. Everything
        here is optional.
      </Text>
      <Text style={s.label}>READING STATUS</Text>
      <View style={s.options}>
        {statuses.map((item) => (
          <Pressable
            key={item.value}
            disabled={!editable}
            accessibilityRole="radio"
            accessibilityState={{
              checked: status === item.value,
              disabled: !editable,
            }}
            onPress={() => setStatus(item.value)}
            style={[s.option, status === item.value && s.selected]}
          >
            <Text
              style={[s.optionText, status === item.value && s.selectedText]}
            >
              {item.label}
            </Text>
          </Pressable>
        ))}
      </View>
      <Text style={s.label}>RATING</Text>
      <View style={s.options}>
        {[null, 1, 2, 3, 4, 5].map((value) => (
          <Pressable
            key={value ?? "none"}
            disabled={!editable}
            accessibilityRole="radio"
            accessibilityLabel={value ? `${value} out of 5 stars` : "Unrated"}
            accessibilityState={{
              checked: rating === value,
              disabled: !editable,
            }}
            onPress={() => setRating(value)}
            style={[s.rating, rating === value && s.selected]}
          >
            <Text style={[s.optionText, rating === value && s.selectedText]}>
              {value ?? "—"}
            </Text>
          </Pressable>
        ))}
      </View>
      <Text style={s.label}>SHELF / LOCATION</Text>
      <TextInput
        accessibilityLabel="Shelf or location"
        editable={editable}
        value={shelf}
        onChangeText={setShelf}
        maxLength={120}
        placeholder="e.g. Living room, top shelf"
        placeholderTextColor={c.muted}
        style={s.input}
      />
      <Text style={s.label}>DATE ACQUIRED</Text>
      <TextInput
        accessibilityLabel="Date acquired, YYYY-MM-DD"
        editable={editable}
        value={date}
        onChangeText={(value) => {
          setDate(value);
          setValidation(null);
        }}
        maxLength={10}
        autoCorrect={false}
        placeholder="YYYY-MM-DD"
        placeholderTextColor={c.muted}
        style={[s.input, validation && s.invalid]}
        keyboardType="numbers-and-punctuation"
      />
      {validation ? (
        <Text accessibilityRole="alert" style={s.errorText}>
          {validation}
        </Text>
      ) : null}
      <Text style={s.label}>PERSONAL NOTES</Text>
      <TextInput
        accessibilityLabel="Personal notes"
        editable={editable}
        value={notes}
        onChangeText={setNotes}
        maxLength={10000}
        placeholder="A gift, a memory, a reason to read…"
        placeholderTextColor={c.muted}
        multiline
        textAlignVertical="top"
        style={[s.input, s.notes]}
      />
      {editable ? (
        <Pressable
          accessibilityRole="button"
          onPress={submit}
          style={s.primary}
        >
          <Text style={s.primaryText}>Save to my library ↗</Text>
        </Pressable>
      ) : null}
      {busy ? (
        <View style={s.feedback} accessibilityLiveRegion="polite">
          <ActivityIndicator color={c.accent} />
          <Text style={s.help}>Saving your copy…</Text>
        </View>
      ) : null}
      {save.state.kind === "duplicate" ? (
        <View style={s.feedback} accessibilityLiveRegion="polite">
          <Text accessibilityRole="header" style={s.feedbackTitle}>
            Another copy?
          </Text>
          <Text style={s.help}>{save.state.message}</Text>
          <Pressable
            accessibilityRole="button"
            onPress={save.confirmDuplicate}
            style={s.primary}
          >
            <Text style={s.primaryText}>Yes, add another physical copy</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={save.edit}
            style={s.secondary}
          >
            <Text style={s.secondaryText}>Cancel and return to details</Text>
          </Pressable>
        </View>
      ) : null}
      {save.state.kind === "error" ? (
        <View style={[s.feedback, s.error]} accessibilityRole="alert">
          <Text style={s.feedbackTitle}>We couldn’t confirm the save.</Text>
          <Text style={s.help}>{save.state.message}</Text>
          <Text style={s.help}>
            Retrying this save won’t create an extra copy.
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={save.retry}
            style={s.primary}
          >
            <Text style={s.primaryText}>Retry save safely ↗</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={save.edit}
            style={s.secondary}
          >
            <Text style={s.secondaryText}>Return to details</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}
const styles = (c: Colors) =>
  StyleSheet.create({
    section: {
      marginTop: 28,
      paddingTop: 24,
      borderTopWidth: 1,
      borderColor: c.accent,
    },
    kicker: {
      color: c.accent,
      fontFamily: mono,
      fontSize: 11,
      letterSpacing: 1,
    },
    heading: {
      color: c.text,
      fontSize: 25,
      lineHeight: 31,
      marginTop: 14,
      fontWeight: "500",
    },
    help: {
      color: c.muted,
      fontSize: 14,
      lineHeight: 21,
      marginTop: 10,
      marginBottom: 12,
    },
    label: {
      color: c.muted,
      fontFamily: mono,
      fontSize: 11,
      letterSpacing: 1,
      marginTop: 18,
      marginBottom: 10,
    },
    options: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    option: {
      minHeight: 48,
      paddingHorizontal: 17,
      justifyContent: "center",
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 3,
    },
    rating: {
      minWidth: 44,
      minHeight: 48,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 3,
    },
    selected: { borderColor: c.accent, backgroundColor: c.accent },
    optionText: { color: c.text, fontSize: 14 },
    selectedText: { color: c.onAccent, fontWeight: "600" },
    input: {
      minHeight: 52,
      backgroundColor: c.panel,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 3,
      color: c.text,
      padding: 14,
      fontSize: 15,
    },
    notes: { minHeight: 116, lineHeight: 22 },
    invalid: { borderColor: c.error },
    errorText: { color: c.error, marginTop: 8, lineHeight: 20 },
    primary: {
      backgroundColor: c.accent,
      padding: 16,
      minHeight: 52,
      borderRadius: 3,
      marginTop: 20,
      justifyContent: "center",
    },
    primaryText: { color: c.onAccent, fontSize: 15, fontWeight: "600" },
    secondary: { minHeight: 48, justifyContent: "center", marginTop: 4 },
    secondaryText: { color: c.text, fontSize: 14 },
    feedback: {
      marginTop: 22,
      padding: 16,
      backgroundColor: c.panel,
      borderLeftWidth: 2,
      borderColor: c.accent,
    },
    error: { borderColor: c.error },
    feedbackTitle: { color: c.text, fontSize: 18, lineHeight: 25 },
    receiptRow: {
      borderBottomWidth: 1,
      borderColor: c.border,
      paddingVertical: 6,
      flexDirection: "row",
      gap: 16,
      alignItems: "baseline",
    },
    receiptValue: { color: c.text, fontSize: 14, flex: 1, textAlign: "right" },
    savedNotes: {
      color: c.text,
      fontSize: 15,
      lineHeight: 23,
      marginVertical: 16,
    },
  });
