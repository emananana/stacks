import { useTheme, useThemedStyles } from "../theme/ThemeProvider";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as Haptics from "expo-haptics";
import { useRef, useState } from "react";
import {
  Linking,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { type Colors, mono } from "../theme/tokens";

export default function ScanScreen({
  onScanned,
}: {
  onScanned: (isbn: string) => void;
}) {
  const { colors: c } = useTheme();
  const s = useThemedStyles(styles);
  const [permission, requestPermission] = useCameraPermissions();
  const [locked, setLocked] = useState(false);
  const [invalid, setInvalid] = useState(false);
  const [manual, setManual] = useState("");
  const lastScan = useRef(0);
  if (!permission)
    return (
      <View style={s.center}>
        <Text style={s.text}>Checking camera access…</Text>
      </View>
    );
  if (!permission.granted)
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.permission}>
          <Text style={s.kicker}>STACKS / SCAN</Text>
          <Text style={s.heading}>
            Camera access is needed to scan an ISBN.
          </Text>
          <Text style={s.text}>
            Stacks only uses the camera to read a book barcode. You can continue
            with manual entry anytime.
          </Text>
          <Pressable onPress={requestPermission} style={s.primary}>
            <Text style={s.primaryText}>Allow camera access</Text>
          </Pressable>
          {!permission.canAskAgain ? (
            <Pressable
              onPress={() => void Linking.openSettings()}
              style={s.secondary}
            >
              <Text style={s.secondaryText}>Open Settings</Text>
            </Pressable>
          ) : null}
        </View>
      </SafeAreaView>
    );
  return (
    <SafeAreaView style={s.safe}>
      <View style={s.container}>
        <View style={s.top}>
          <Text style={s.kicker}>CATALOG / SCAN</Text>
          <Text style={s.text}>
            Point at the ISBN barcode on the back of a book.
          </Text>
        </View>
        <View style={s.cameraFrame}>
          <CameraView
            style={StyleSheet.absoluteFill}
            facing="back"
            barcodeScannerSettings={{
              barcodeTypes: ["ean13", "ean8", "upc_a", "upc_e"],
            }}
            onBarcodeScanned={
              locked
                ? undefined
                : ({ data }) => {
                    if (Date.now() - lastScan.current < 1500) return;
                    lastScan.current = Date.now();
                    if (
                      /^(97[89])?\d{9,12}$/.test(data.replace(/[\s-]/g, ""))
                    ) {
                      setLocked(true);
                      void Haptics.notificationAsync(
                        Haptics.NotificationFeedbackType.Success,
                      );
                      onScanned(data);
                    } else setInvalid(true);
                  }
            }
          />
          <View pointerEvents="none" style={s.scanLine} />
        </View>
        {locked ? (
          <Text style={s.signal}>● SIGNAL ACQUIRED</Text>
        ) : (
          <Text style={s.text}>Center the barcode inside the frame.</Text>
        )}
        <Text style={s.note}>Retail ISBN barcodes are usually ISBN-13.</Text>
        {invalid ? (
          <Text style={s.error}>
            That barcode is not a valid ISBN. Try another barcode or enter the
            ISBN below.
          </Text>
        ) : null}
        {locked ? (
          <Pressable
            onPress={() => {
              setLocked(false);
              setInvalid(false);
            }}
            style={s.secondary}
          >
            <Text style={s.secondaryText}>Scan another book</Text>
          </Pressable>
        ) : null}
        <View style={s.manual}>
          <Text style={s.manualLabel}>CAN’T SCAN?</Text>
          <TextInput
            accessibilityLabel="Manual ISBN"
            value={manual}
            onChangeText={setManual}
            placeholder="Enter ISBN manually"
            placeholderTextColor={c.muted}
            style={s.input}
            keyboardType="numbers-and-punctuation"
            autoCapitalize="characters"
          />
          <Pressable
            disabled={!manual.trim()}
            onPress={() => onScanned(manual.trim())}
            style={[s.primary, !manual.trim() && s.disabled]}
          >
            <Text style={s.primaryText}>Use this ISBN ↗</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}
const styles = (c: Colors) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.background },
    container: { flex: 1, padding: 24, alignItems: "center" },
    center: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: c.background,
    },
    permission: { padding: 24, marginTop: 50 },
    kicker: {
      fontFamily: mono,
      fontSize: 10,
      letterSpacing: 1.5,
      color: c.accent,
    },
    heading: { color: c.text, fontSize: 28, lineHeight: 34, marginTop: 18 },
    text: { color: c.muted, fontSize: 15, lineHeight: 23, marginTop: 12 },
    top: { alignSelf: "stretch" },
    cameraFrame: {
      width: "100%",
      maxWidth: 420,
      aspectRatio: 1.25,
      marginTop: 28,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: c.accent,
      backgroundColor: c.panel,
    },
    scanLine: {
      position: "absolute",
      left: 16,
      right: 16,
      top: "50%",
      height: 2,
      backgroundColor: c.accent,
    },
    signal: {
      fontFamily: mono,
      color: c.accent,
      fontSize: 11,
      letterSpacing: 1,
      marginTop: 24,
    },
    note: { fontSize: 12, color: c.muted, marginTop: 12, textAlign: "center" },
    error: {
      color: c.error,
      fontSize: 13,
      lineHeight: 19,
      textAlign: "center",
      marginTop: 16,
    },
    manual: {
      alignSelf: "stretch",
      marginTop: 22,
      borderTopWidth: 1,
      borderColor: c.border,
      paddingTop: 16,
    },
    manualLabel: {
      fontFamily: mono,
      fontSize: 10,
      letterSpacing: 1,
      color: c.muted,
      marginBottom: 8,
    },
    input: {
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.panel,
      color: c.text,
      padding: 13,
      borderRadius: 3,
      fontFamily: mono,
    },
    primary: {
      backgroundColor: c.accent,
      padding: 16,
      marginTop: 24,
      borderRadius: 3,
    },
    primaryText: { color: c.onAccent, fontWeight: "600", fontSize: 15 },
    disabled: { opacity: 0.45 },
    secondary: { padding: 16, alignItems: "center" },
    secondaryText: { color: c.text, fontSize: 14 },
  });
