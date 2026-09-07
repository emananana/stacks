import { useThemedStyles } from "../theme/ThemeProvider";
import { useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { type Colors, serif } from "../theme/tokens";
export default function BookJacket({
  title,
  cover,
  small = false,
}: {
  title: string;
  cover: string | null;
  small?: boolean;
}) {
  const s = useThemedStyles(styles);
  const [failed, setFailed] = useState(false);
  const palette = ["#B4BEA0", "#B5A8BA", "#C8A98A", "#A1B7BC"];
  const color =
    palette[
      Array.from(title).reduce((n, char) => n + char.charCodeAt(0), 0) %
        palette.length
    ];
  return (
    <View style={[s.jacket, small && s.small]}>
      {cover && !failed ? (
        <Image
          accessibilityLabel={`Cover of ${title}`}
          source={{ uri: cover }}
          onError={() => setFailed(true)}
          resizeMode="contain"
          style={s.image}
        />
      ) : (
        <View style={[s.fallback, { backgroundColor: color }]}>
          <View style={s.spine} />
          <Text style={s.flower}>✳</Text>
          <Text numberOfLines={5} style={[s.title, small && { fontSize: 13 }]}>
            {title}
          </Text>
          <View style={s.rule} />
          <Text style={s.imprint}>STACKS</Text>
        </View>
      )}
    </View>
  );
}
const styles = (c: Colors) =>
  StyleSheet.create({
    jacket: {
      width: 112,
      height: 166,
      shadowColor: "#000",
      shadowOpacity: 0.3,
      shadowRadius: 8,
      shadowOffset: { width: 3, height: 5 },
    },
    small: { width: 90, height: 134 },
    image: { width: "100%", height: "100%" },
    fallback: {
      flex: 1,
      borderRadius: 2,
      padding: 13,
      paddingLeft: 18,
      alignItems: "center",
      justifyContent: "space-between",
    },
    spine: {
      position: "absolute",
      left: 5,
      top: 0,
      bottom: 0,
      width: 2,
      backgroundColor: "#00000019",
    },
    flower: { fontSize: 19, color: c.ink },
    title: {
      fontFamily: serif,
      fontSize: 16,
      color: c.ink,
      textAlign: "center",
    },
    rule: {
      width: 26,
      borderTopWidth: 1,
      borderColor: "#1B241650",
      marginTop: 4,
    },
    imprint: { fontSize: 7, letterSpacing: 2, color: c.ink },
  });
