import { ThemeProvider } from "./theme/ThemeProvider";
import { useTheme, useThemedStyles } from "./theme/ThemeProvider";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import LookupScreen from "./app/LookupScreen";
import LibraryScreen from "./app/LibraryScreen";
import ScanScreen from "./app/ScanScreen";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { type Colors } from "./theme/tokens";
import AuthScreen from "./app/AuthScreen";
import { restoreSession, type Session } from "./services/auth";
import { useEffect } from "react";
function AppContent() {
  const { isDark } = useTheme();
  const s = useThemedStyles(styles);
  const [screen, setScreen] = useState<"lookup" | "library" | "scan">(
    "library",
  );
  const [prefillIsbn, setPrefillIsbn] = useState<string>();
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  useEffect(() => {
    restoreSession()
      .then(setSession)
      .finally(() => setAuthLoading(false));
  }, []);
  if (authLoading)
    return (
      <View style={[s.app, s.center]}>
        <Text style={s.loading}>Opening your library…</Text>
      </View>
    );
  if (!session) return <AuthScreen onAuthenticated={setSession} />;
  return (
    <SafeAreaProvider>
      <StatusBar style={isDark ? "light" : "dark"} />
      <View style={s.app}>
        {screen === "lookup" ? (
          <LookupScreen prefillIsbn={prefillIsbn} />
        ) : screen === "library" ? (
          <LibraryScreen onScan={() => setScreen("scan")} />
        ) : (
          <ScanScreen
            onScanned={(isbn) => {
              setPrefillIsbn(isbn);
              setScreen("lookup");
            }}
          />
        )}
      </View>
      <SafeAreaView edges={["bottom", "left", "right"]} style={s.footer}>
        <View style={s.nav}>
          {(
            [
              ["library", "▥", "My library"],
              ["scan", "⌗", "Scan a book"],
              ["lookup", "+", "Find by ISBN"],
            ] as const
          ).map(([value, icon, label]) => (
            <Pressable
              key={value}
              accessibilityRole="tab"
              accessibilityLabel={label}
              accessibilityState={{ selected: screen === value }}
              style={({ pressed }) => [
                s.tab,
                screen === value && s.selected,
                pressed && { opacity: 0.65 },
              ]}
              onPress={() => {
                if (value === "lookup") setPrefillIsbn(undefined);
                setScreen(value);
              }}
            >
              <Text
                accessible={false}
                style={[s.icon, screen === value && s.active]}
              >
                {icon}
              </Text>
              <Text style={[s.label, screen === value && s.active]}>
                {label}
              </Text>
            </Pressable>
          ))}
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
const styles = (c: Colors) =>
  StyleSheet.create({
    app: { flex: 1, backgroundColor: c.background },
    footer: {
      backgroundColor: c.background,
      borderTopWidth: 1,
      borderColor: c.border,
    },
    nav: {
      flexDirection: "row",
      paddingHorizontal: 10,
      paddingVertical: 6,
      gap: 4,
    },
    tab: {
      flex: 1,
      minHeight: 58,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 8,
      gap: 2,
    },
    selected: { backgroundColor: c.selected },
    icon: { fontSize: 24, color: c.muted },
    label: { fontSize: 12, color: c.muted, fontWeight: "500" },
    active: { color: c.accent },
    center: { alignItems: "center", justifyContent: "center" },
    loading: { color: c.muted },
  });

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}
