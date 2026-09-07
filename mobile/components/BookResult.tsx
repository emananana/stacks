import { useThemedStyles } from "../theme/ThemeProvider";
import { useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import type { LookupResult } from "../services/api";
import { type Colors, mono } from "../theme/tokens";

export function BookResult({ result }: { result: LookupResult }) {
  const s = useThemedStyles(styles);
  const { book } = result;
  const [coverFailed, setCoverFailed] = useState(false);
  const fields = [
    ["ISBN-13", book.isbn13],
    ["ISBN-10", book.isbn10],
    ["PUBLISHER", book.publisher],
    ["PUBLISHED", book.publication_date],
    ["PAGES", book.page_count?.toString()],
  ].filter(([, value]) => value);
  return (
    <View style={s.container}>
      <View style={s.resultHeader}>
        <Text style={s.signal}>● ISBN IDENTIFIED</Text>
        <Text style={s.source}>
          {result.source === "cache" ? "CACHED" : "OPEN LIBRARY"}
        </Text>
      </View>
      <View style={s.hero}>
        {book.cover_url && !coverFailed ? (
          <Image
            source={{ uri: book.cover_url }}
            style={s.cover}
            resizeMode="contain"
            accessibilityLabel={`Cover of ${book.title}`}
            onError={() => setCoverFailed(true)}
          />
        ) : (
          <View style={[s.cover, s.fallback]}>
            <Text style={s.fallbackMark}>S /</Text>
            <Text style={s.source}>NO COVER</Text>
          </View>
        )}
        <View style={s.titleBlock}>
          <Text style={s.label}>EDITION RECORD</Text>
          <Text accessibilityRole="header" style={s.title}>
            {book.title}
          </Text>
          {book.subtitle ? (
            <Text style={s.subtitle}>{book.subtitle}</Text>
          ) : null}
          <Text style={s.authors}>
            {(book.authors ?? []).map((a) => a.name).join(", ") ||
              "Author unavailable"}
          </Text>
        </View>
      </View>
      <View style={s.metadata}>
        {fields.map(([label, value]) => (
          <View key={label} style={s.row}>
            <Text style={s.label}>{label}</Text>
            <Text selectable style={s.value}>
              {value}
            </Text>
          </View>
        ))}
      </View>
      {book.description ? (
        <Text style={s.description}>{book.description}</Text>
      ) : null}
    </View>
  );
}
const styles = (c: Colors) =>
  StyleSheet.create({
    container: {
      marginTop: 28,
      borderTopWidth: 1,
      borderColor: c.accent,
      paddingTop: 18,
    },
    resultHeader: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 12,
      justifyContent: "space-between",
      marginBottom: 24,
    },
    signal: {
      color: c.accent,
      fontFamily: mono,
      fontSize: 11,
      letterSpacing: 1,
    },
    source: {
      color: c.muted,
      fontFamily: mono,
      fontSize: 10,
      letterSpacing: 1,
    },
    hero: { flexDirection: "row", alignItems: "flex-start", gap: 20 },
    cover: { width: 100, height: 150, backgroundColor: c.panel },
    fallback: {
      borderWidth: 1,
      borderColor: c.border,
      justifyContent: "space-between",
      padding: 12,
    },
    fallbackMark: { fontSize: 36, color: c.accent, fontFamily: mono },
    titleBlock: { flex: 1, gap: 8 },
    label: { color: c.muted, fontFamily: mono, fontSize: 10, letterSpacing: 1 },
    title: { fontSize: 24, lineHeight: 29, fontWeight: "600", color: c.text },
    subtitle: { color: c.muted, fontSize: 14, lineHeight: 20 },
    authors: { color: c.text, fontSize: 14, lineHeight: 21 },
    metadata: { marginTop: 24 },
    row: {
      borderTopWidth: 1,
      borderColor: c.border,
      paddingVertical: 13,
      flexDirection: "row",
      gap: 16,
      alignItems: "baseline",
    },
    value: {
      flex: 1,
      textAlign: "right",
      color: c.text,
      fontSize: 14,
      lineHeight: 21,
    },
    description: {
      color: c.muted,
      lineHeight: 23,
      fontSize: 15,
      marginTop: 16,
    },
    notice: {
      marginTop: 20,
      padding: 16,
      borderLeftWidth: 2,
      borderColor: c.accent,
      backgroundColor: c.panel,
    },
    noticeTitle: {
      color: c.text,
      fontSize: 14,
      fontWeight: "500",
      marginBottom: 6,
    },
    noticeText: { color: c.muted, fontSize: 13, lineHeight: 20 },
  });
