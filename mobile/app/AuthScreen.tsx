import { useState } from "react";
import {
  ActivityIndicator,
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
import { mono, serif, type Colors } from "../theme/tokens";
import { useTheme, useThemedStyles } from "../theme/ThemeProvider";
import { login, register, type Session } from "../services/auth";

export default function AuthScreen({
  onAuthenticated,
}: {
  onAuthenticated: (session: Session) => void;
}) {
  const { colors: c } = useTheme();
  const s = useThemedStyles(styles);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function submit() {
    setBusy(true);
    setError(null);
    try {
      onAuthenticated(
        await (mode === "login"
          ? login(email, password)
          : register(email, password)),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not sign you in.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={s.content}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={s.brand}>stacks.</Text>
          <Text style={s.kicker}>YOUR PERSONAL LIBRARY</Text>
          <View style={s.rule} />
          <Text style={s.eyebrow}>
            {mode === "login" ? "WELCOME BACK" : "A NEW LIBRARY CARD"}
          </Text>
          <Text accessibilityRole="header" style={s.heading}>
            {mode === "login" ? "Come on in." : "Make it yours."}
          </Text>
          <Text style={s.intro}>
            {mode === "login"
              ? "Your books are waiting on their shelves."
              : "Create an account to keep your collection private."}
          </Text>
          <Text style={s.label}>EMAIL</Text>
          <TextInput
            accessibilityLabel="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            editable={!busy}
            style={s.input}
            placeholder="you@example.com"
            placeholderTextColor={c.muted}
          />
          <Text style={s.label}>PASSWORD</Text>
          <TextInput
            accessibilityLabel="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            editable={!busy}
            style={s.input}
            placeholder={
              mode === "register" ? "12 characters minimum" : "Your password"
            }
            placeholderTextColor={c.muted}
            onSubmitEditing={() => void submit()}
          />
          {error && (
            <Text accessibilityRole="alert" style={s.error}>
              {error}
            </Text>
          )}
          <Pressable
            accessibilityRole="button"
            disabled={busy || !email || !password}
            onPress={() => void submit()}
            style={[
              s.primary,
              (busy || !email || !password) && { opacity: 0.5 },
            ]}
          >
            {busy ? (
              <ActivityIndicator color={c.onAccent} />
            ) : (
              <Text style={s.primaryText}>
                {mode === "login" ? "Open my library" : "Create my library"}
              </Text>
            )}
          </Pressable>
          <Pressable
            accessibilityRole="button"
            disabled={busy}
            onPress={() => {
              setMode(mode === "login" ? "register" : "login");
              setError(null);
            }}
            style={s.switch}
          >
            <Text style={s.switchText}>
              {mode === "login"
                ? "New to Stacks? Create an account"
                : "Already have an account? Sign in"}
            </Text>
          </Pressable>
          <Text style={s.note}>
            Your password is protected with Argon2 and never stored on your
            phone.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
const styles = (c: Colors) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.background },
    content: {
      padding: 26,
      paddingTop: 50,
      maxWidth: 560,
      width: "100%",
      alignSelf: "center",
    },
    brand: {
      fontFamily: serif,
      fontSize: 42,
      color: c.text,
      letterSpacing: -2,
    },
    kicker: {
      fontFamily: mono,
      fontSize: 9,
      letterSpacing: 1.5,
      color: c.muted,
      marginTop: 3,
    },
    rule: { borderTopWidth: 1, borderColor: c.border, marginTop: 28 },
    eyebrow: {
      fontFamily: mono,
      fontSize: 10,
      letterSpacing: 1,
      color: c.accent,
      marginTop: 26,
    },
    heading: { fontFamily: serif, fontSize: 37, color: c.text, marginTop: 14 },
    intro: {
      color: c.muted,
      fontSize: 15,
      lineHeight: 23,
      marginTop: 12,
      marginBottom: 22,
    },
    label: {
      fontFamily: mono,
      fontSize: 10,
      letterSpacing: 1,
      color: c.muted,
      marginTop: 17,
      marginBottom: 8,
    },
    input: {
      minHeight: 52,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.panel,
      color: c.text,
      paddingHorizontal: 14,
      borderRadius: 4,
      fontSize: 16,
    },
    primary: {
      minHeight: 52,
      marginTop: 25,
      backgroundColor: c.accent,
      borderRadius: 4,
      alignItems: "center",
      justifyContent: "center",
    },
    primaryText: { color: c.onAccent, fontSize: 15, fontWeight: "600" },
    error: { color: c.error, marginTop: 15, lineHeight: 20 },
    switch: { minHeight: 52, justifyContent: "center", alignItems: "center" },
    switchText: { color: c.accent, fontSize: 14 },
    note: {
      color: c.muted,
      fontSize: 11,
      lineHeight: 17,
      textAlign: "center",
      marginTop: 18,
    },
  });
