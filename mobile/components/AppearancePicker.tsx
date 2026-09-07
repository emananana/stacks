import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme, useThemedStyles } from "../theme/ThemeProvider";
import type { Colors } from "../theme/tokens";

export default function AppearancePicker() {
  const { preference, setPreference, storageError } = useTheme();
  const [expanded, setExpanded] = useState(false);
  const s = useThemedStyles(styles);
  return (
    <View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Appearance settings"
        accessibilityState={{ expanded }}
        onPress={() => setExpanded(!expanded)}
        style={s.toggle}
      >
        <Text style={s.label}>
          Appearance · {preference[0]!.toUpperCase() + preference.slice(1)}{" "}
          {expanded ? "↑" : "↓"}
        </Text>
      </Pressable>
      {expanded && (
        <View style={s.panel}>
          <Text style={s.title}>Make yourself comfortable.</Text>
          <View style={s.row}>
            {(["light", "dark", "system"] as const).map((value) => (
              <Pressable
                key={value}
                accessibilityRole="radio"
                accessibilityLabel={`${value} appearance`}
                accessibilityState={{ checked: preference === value }}
                onPress={() => setPreference(value)}
                style={[s.choice, preference === value && s.selected]}
              >
                <Text style={[s.label, preference === value && s.selectedText]}>
                  {value[0]!.toUpperCase() + value.slice(1)}
                </Text>
              </Pressable>
            ))}
          </View>
          <Text style={s.hint}>
            System follows your device. Your choice is saved on this device.
          </Text>
        </View>
      )}
      {storageError && (
        <Text accessibilityRole="alert" style={s.error}>
          {storageError}
        </Text>
      )}
    </View>
  );
}
const styles = (c: Colors) =>
  StyleSheet.create({
    toggle: {
      alignSelf: "flex-end",
      minHeight: 44,
      justifyContent: "center",
      paddingLeft: 12,
    },
    label: { color: c.muted, fontSize: 12 },
    panel: {
      padding: 14,
      backgroundColor: c.panel,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 5,
      marginBottom: 6,
    },
    title: { color: c.text, fontSize: 15, marginBottom: 12 },
    row: { flexDirection: "row", gap: 8 },
    choice: {
      flex: 1,
      minHeight: 46,
      justifyContent: "center",
      alignItems: "center",
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 4,
    },
    selected: { backgroundColor: c.accent, borderColor: c.accent },
    selectedText: { color: c.onAccent, fontWeight: "600" },
    hint: { color: c.muted, fontSize: 11, lineHeight: 17, marginTop: 10 },
    error: { color: c.error, fontSize: 12, lineHeight: 18, paddingVertical: 8 },
  });
