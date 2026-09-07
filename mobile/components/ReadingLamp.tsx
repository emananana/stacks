import { useThemedStyles } from "../theme/ThemeProvider";
import { StyleSheet, View } from "react-native";
import { type Colors } from "../theme/tokens";

/** A resolution-independent illustration made from native shapes. */
export default function ReadingLamp() {
  const s = useThemedStyles(styles);
  return (
    <View style={s.scene} accessible={false} pointerEvents="none">
      <View style={s.halo} />
      <View style={s.moon}>
        <View style={s.cut} />
      </View>
      <View style={s.stem} />
      <View style={s.shade} />
      <View style={s.rim} />
      <View style={s.base} />
      <View style={[s.book, s.top]}>
        <View style={s.pages} />
      </View>
      <View style={[s.book, s.bottom]}>
        <View style={s.pages} />
      </View>
      <View style={s.desk} />
    </View>
  );
}
const styles = (c: Colors) =>
  StyleSheet.create({
    scene: { width: 116, height: 144 },
    halo: {
      position: "absolute",
      width: 108,
      height: 108,
      borderRadius: 54,
      backgroundColor: c.halo,
      top: 24,
      left: 3,
    },
    moon: {
      position: "absolute",
      width: 17,
      height: 17,
      borderRadius: 10,
      backgroundColor: c.paper,
      right: 3,
      top: 5,
      overflow: "hidden",
    },
    cut: {
      width: 17,
      height: 17,
      borderRadius: 10,
      backgroundColor: c.background,
      left: 6,
      top: -4,
    },
    stem: {
      position: "absolute",
      width: 4,
      height: 52,
      backgroundColor: "#B59E77",
      left: 49,
      top: 55,
    },
    shade: {
      position: "absolute",
      width: 57,
      height: 0,
      borderBottomWidth: 35,
      borderBottomColor: "#C5D99B",
      borderLeftWidth: 12,
      borderLeftColor: "transparent",
      borderRightWidth: 12,
      borderRightColor: "transparent",
      left: 22,
      top: 24,
    },
    rim: {
      position: "absolute",
      width: 63,
      height: 5,
      borderRadius: 3,
      backgroundColor: "#D7E2B6",
      left: 19,
      top: 57,
    },
    base: {
      position: "absolute",
      width: 40,
      height: 5,
      borderRadius: 5,
      backgroundColor: "#B59E77",
      left: 31,
      top: 103,
    },
    book: {
      position: "absolute",
      height: 12,
      borderRadius: 2,
      paddingVertical: 3,
      paddingRight: 3,
      paddingLeft: 8,
    },
    top: {
      width: 59,
      left: 29,
      top: 111,
      backgroundColor: "#B4A4BF",
      transform: [{ rotate: "-4deg" }],
    },
    bottom: { width: 76, left: 20, top: 124, backgroundColor: "#BD8F72" },
    pages: { flex: 1, backgroundColor: c.paper, borderRadius: 1 },
    desk: {
      position: "absolute",
      bottom: 5,
      left: 3,
      right: 3,
      height: 1,
      backgroundColor: "#7D8067",
    },
  });
