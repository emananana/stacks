import { useTheme, useThemedStyles } from "../theme/ThemeProvider";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CopyForm } from "../components/CopyForm";
import { BookResult } from "../components/BookResult";
import { useLookup } from "../hooks/useLookup";
import { type Colors, mono, serif } from "../theme/tokens";

export default function LookupScreen({
  prefillIsbn,
}: {
  prefillIsbn?: string;
}) {
  const { colors: c } = useTheme();
  const s = useThemedStyles(styles);
  const [saving, setSaving] = useState(false);
  const [isbn, setIsbn] = useState("");
  const { state, submit, reset } = useLookup();
  const input = useRef<TextInput>(null);
  const loading = state.kind === "loading";
  useEffect(() => {
    if (prefillIsbn) {
      setIsbn(prefillIsbn);
      void submit(prefillIsbn);
    }
  }, [prefillIsbn]);
  function findBook() {
    if (saving) return;
    Keyboard.dismiss();
    void submit(isbn);
  }
  function change(value: string) {
    setIsbn(value);
    reset();
  }
  return (
    <SafeAreaView edges={["top", "left", "right"]} style={s.safe}>
      <KeyboardAvoidingView
        style={s.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={s.content}
          keyboardShouldPersistTaps="handled"
        >
          <View style={s.header}>
            <View>
              <Text style={s.brand}>stacks.</Text>
              <Text style={s.brandSub}>YOUR PERSONAL LIBRARY</Text>
            </View>
            <View style={s.edition}>
              <Text style={s.editionText}>A NEW CHAPTER</Text>
              <View style={s.accentLine} />
            </View>
          </View>
          <View style={s.sectionLine}>
            <Text style={s.sectionLabel}>FIND A BOOK</Text>
            <Text style={s.sectionLabel}>✳</Text>
          </View>
          <Text accessibilityRole="header" style={s.heading}>
            Found a keeper?{"\n"}Let’s make room.
          </Text>
          <Text style={s.intro}>
            Start with the number on the back. We’ll find the details that make
            it yours.
          </Text>
          <View style={s.form}>
            <Text nativeID="isbn-label" style={s.inputLabel}>
              BOOK ISBN
            </Text>
            <TextInput
              ref={input}
              accessibilityLabel="Book ISBN"
              accessibilityHint="Enter an ISBN-10 or ISBN-13. Spaces and hyphens are accepted."
              style={[s.input, state.kind === "error" && s.inputError]}
              editable={!saving}
              value={isbn}
              onChangeText={change}
              placeholder="978-0-…"
              placeholderTextColor={c.muted}
              maxLength={32}
              autoCapitalize="characters"
              autoCorrect={false}
              returnKeyType="search"
              onSubmitEditing={findBook}
            />
            <Text style={s.hint}>
              10 or 13 characters. Spaces and hyphens are fine.
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Look up book"
              accessibilityState={{
                disabled: loading || saving,
                busy: loading || saving,
              }}
              disabled={loading || saving}
              onPress={findBook}
              style={({ pressed }) => [
                s.button,
                (pressed || loading || saving) && s.buttonPressed,
              ]}
            >
              {loading ? (
                <ActivityIndicator color={c.onAccent} />
              ) : (
                <Text style={s.buttonText}>Look up book</Text>
              )}
              <Text style={s.arrow}>{loading ? "…" : "↗"}</Text>
            </Pressable>
          </View>
          {state.kind === "loading" ? (
            <View accessibilityLiveRegion="polite" style={s.feedback}>
              <Text style={s.feedbackTitle}>Finding your edition…</Text>
              <Text style={s.feedbackText}>
                Checking the archive and Open Library.
              </Text>
            </View>
          ) : null}
          {state.kind === "error" ? (
            <View
              accessibilityRole="alert"
              accessibilityLiveRegion="assertive"
              style={[s.feedback, s.error]}
            >
              <Text style={s.errorTitle}>We couldn’t complete the lookup.</Text>
              <Text style={s.feedbackText}>{state.message}</Text>
              <Pressable
                accessibilityRole="button"
                onPress={findBook}
                style={s.retry}
              >
                <Text style={s.retryText}>Try again ↗</Text>
              </Pressable>
            </View>
          ) : null}
          {state.kind === "success" ? (
            <View key={state.result.book.id}>
              <BookResult result={state.result} />
              <CopyForm
                editionId={state.result.book.id}
                onBusyChange={setSaving}
                onDone={() => {
                  change("");
                  input.current?.focus();
                }}
              />
            </View>
          ) : null}
          {state.kind === "idle" ? (
            <View style={s.empty}>
              <View
                style={s.bookSpines}
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
              >
                {[38, 54, 47, 62, 42].map((height, i) => (
                  <View
                    key={i}
                    style={[s.spine, { height }, i === 3 && s.spineAccent]}
                  />
                ))}
              </View>
              <Text style={s.emptyTitle}>Your next entry starts here.</Text>
              <Text style={s.emptyText}>
                Enter a book’s ISBN to preview its title, authors, cover, and
                publication details.
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  change("9780140328721");
                  input.current?.focus();
                }}
                style={s.example}
              >
                <Text style={s.exampleText}>
                  Try an example: Fantastic Mr. Fox ↗
                </Text>
              </Pressable>
            </View>
          ) : null}
          <View style={s.footer}>
            <Text style={s.footerLabel}>BUILT FOR THE BOOKS YOU KEEP.</Text>
            <Text style={s.footerNote}>
              Metadata by Open Library · Your physical collection
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
const styles = (c: Colors) =>
  StyleSheet.create({
    flex: { flex: 1 },
    safe: { flex: 1, backgroundColor: c.background },
    content: {
      paddingHorizontal: 24,
      paddingTop: 24,
      width: "100%",
      maxWidth: 600,
      alignSelf: "center",
      flexGrow: 1,
      paddingBottom: 28,
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 32,
    },
    brand: {
      fontSize: 33,
      letterSpacing: -1.6,
      color: c.text,
      fontFamily: serif,
    },
    brandSub: {
      color: c.muted,
      fontFamily: mono,
      fontSize: 9,
      letterSpacing: 2,
      marginTop: 3,
    },
    edition: { alignItems: "flex-end", gap: 9 },
    editionText: {
      color: c.muted,
      fontSize: 10,
      fontFamily: mono,
      letterSpacing: 1,
    },
    accentLine: { width: 38, height: 3, backgroundColor: c.accent },
    sectionLine: {
      borderTopWidth: 1,
      borderColor: c.border,
      paddingTop: 14,
      flexDirection: "row",
      justifyContent: "space-between",
    },
    sectionLabel: {
      color: c.accent,
      fontSize: 10,
      fontFamily: mono,
      letterSpacing: 1.5,
    },
    heading: {
      color: c.text,
      fontSize: 36,
      lineHeight: 41,
      letterSpacing: -1.2,
      fontFamily: serif,
      marginTop: 30,
    },
    intro: {
      color: c.muted,
      fontSize: 15,
      lineHeight: 23,
      marginTop: 14,
      maxWidth: 330,
    },
    form: { marginTop: 30 },
    inputLabel: {
      color: c.text,
      fontFamily: mono,
      fontSize: 11,
      letterSpacing: 1.5,
      marginBottom: 10,
    },
    input: {
      backgroundColor: c.panel,
      borderColor: c.border,
      borderWidth: 1,
      borderRadius: 3,
      paddingHorizontal: 16,
      paddingVertical: 16,
      color: c.text,
      fontFamily: mono,
      fontSize: 20,
      minHeight: 58,
    },
    inputError: { borderColor: c.error },
    hint: { color: c.muted, fontSize: 12, lineHeight: 18, marginTop: 9 },
    button: {
      marginTop: 20,
      minHeight: 54,
      paddingHorizontal: 18,
      paddingVertical: 14,
      backgroundColor: c.accent,
      borderRadius: 3,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    buttonPressed: { opacity: 0.65 },
    buttonText: { color: c.onAccent, fontSize: 16, fontWeight: "600" },
    arrow: { color: c.onAccent, fontSize: 23 },
    feedback: {
      marginTop: 24,
      borderLeftWidth: 2,
      borderColor: c.accent,
      padding: 16,
      backgroundColor: c.panel,
    },
    feedbackTitle: { color: c.text, fontSize: 15 },
    feedbackText: {
      color: c.muted,
      fontSize: 14,
      lineHeight: 21,
      marginTop: 8,
    },
    error: { borderColor: c.error },
    errorTitle: { color: c.error, fontSize: 15 },
    retry: {
      minHeight: 44,
      justifyContent: "center",
      alignSelf: "flex-start",
      paddingRight: 20,
    },
    retryText: { color: c.text, fontSize: 14 },
    empty: {
      alignItems: "center",
      borderTopWidth: 1,
      borderColor: c.border,
      marginTop: 32,
      paddingTop: 26,
      paddingBottom: 16,
    },
    bookSpines: {
      flexDirection: "row",
      alignItems: "flex-end",
      gap: 4,
      height: 65,
      borderBottomWidth: 1,
      borderColor: c.border,
      paddingHorizontal: 12,
      marginBottom: 18,
    },
    spine: {
      width: 12,
      borderWidth: 1,
      borderColor: c.border,
      borderTopWidth: 3,
    },
    spineAccent: {
      backgroundColor: c.selected,
      borderColor: c.accent,
      transform: [{ rotate: "-8deg" }],
      marginHorizontal: 3,
    },
    emptyTitle: { color: c.text, fontSize: 16, marginBottom: 8 },
    emptyText: {
      color: c.muted,
      textAlign: "center",
      fontSize: 13,
      lineHeight: 20,
      maxWidth: 280,
    },
    example: {
      minHeight: 44,
      justifyContent: "center",
      paddingHorizontal: 12,
      marginTop: 6,
    },
    exampleText: { color: c.accent, fontSize: 12 },
    footer: {
      marginTop: 28,
      paddingTop: 18,
      borderTopWidth: 1,
      borderColor: c.border,
      gap: 7,
    },
    footerLabel: {
      color: c.muted,
      fontFamily: mono,
      fontSize: 9,
      letterSpacing: 1,
    },
    footerNote: { color: c.muted, fontSize: 11 },
  });
