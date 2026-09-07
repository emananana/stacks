import AppearancePicker from "../components/AppearancePicker";
import { useTheme, useThemedStyles } from "../theme/ThemeProvider";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  getLibrary,
  type LibraryItem,
  type LibraryResponse,
} from "../services/library";
import { type Colors, mono, serif } from "../theme/tokens";
import ReadingLamp from "../components/ReadingLamp";
import BookJacket from "../components/BookJacket";
import LibraryCardDetail from "../components/LibraryCardDetail";

export default function LibraryScreen({ onScan }: { onScan: () => void }) {
  const { colors: c } = useTheme();
  const s = useThemedStyles(styles);
  const [data, setData] = useState<LibraryResponse | null>(null);
  const [overview, setOverview] = useState<LibraryResponse | null>(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [sort, setSort] = useState("recent");
  const [showSort, setShowSort] = useState(false);
  const [revision, setRevision] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<LibraryItem | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    const timer = setTimeout(
      () => {
        getLibrary(controller.signal, query, status, sort)
          .then((result) => {
            if (!controller.signal.aborted) setData(result);
          })
          .catch((e) => {
            if (!controller.signal.aborted)
              setError(e instanceof Error ? e.message : "Please try again.");
          })
          .finally(() => {
            if (!controller.signal.aborted) setLoading(false);
          });
      },
      query ? 250 : 0,
    );
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, status, sort, revision]);
  useEffect(() => {
    const controller = new AbortController();
    getLibrary(controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) setOverview(result);
      })
      .catch(() => {
        if (!controller.signal.aborted) setOverview(null);
      });
    return () => controller.abort();
  }, [revision]);
  const sorts = [
    ["recent", "Date added"],
    ["title", "Title"],
    ["author", "Author"],
    ["rating", "Rating"],
  ] as const;
  const rows =
    data?.items.reduce<LibraryItem[][]>((result, item, index) => {
      if (index % 2 === 0) result.push([]);
      result[result.length - 1]!.push(item);
      return result;
    }, []) ?? [];
  return (
    <SafeAreaView edges={["top", "left", "right"]} style={s.safe}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={s.content}
      >
        <View style={s.masthead}>
          <Text style={s.brand}>
            stacks<Text style={{ color: c.accent }}>.</Text>
          </Text>
          <Text style={s.edition}>YOUR PERSONAL LIBRARY</Text>
        </View>
        <AppearancePicker />
        <View style={s.hero}>
          <View style={s.heroCopy}>
            <Text style={s.eyebrow}>MAKE YOURSELF AT HOME</Text>
            <Text accessibilityRole="header" style={s.heading}>
              A little library.{"\n"}All yours.
            </Text>
            <Text style={s.intro}>Old favorites. New chapters.</Text>
          </View>
          <ReadingLamp />
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={onScan}
          style={({ pressed }) => [s.scan, pressed && { opacity: 0.75 }]}
        >
          <Text style={s.scanText}>Scan a book</Text>
          <Text style={s.scanText}>+ </Text>
        </Pressable>
        <View style={s.stats}>
          {[
            [overview?.books_owned, "On shelves"],
            [overview?.books_read, "Read"],
            [overview?.currently_reading, "Reading"],
            [overview?.unread, "To read"],
          ].map(([count, label]) => (
            <View key={label} style={s.stat}>
              <Text style={s.number}>{count ?? "—"}</Text>
              <Text style={s.statLabel}>{label}</Text>
            </View>
          ))}
        </View>
        <View style={s.section}>
          <Text accessibilityRole="header" style={s.sectionTitle}>
            On your shelves
          </Text>
          <Text style={s.star} accessible={false}>
            ✳
          </Text>
        </View>
        <TextInput
          accessibilityLabel="Search title or author"
          value={query}
          onChangeText={setQuery}
          placeholder="Search title or author"
          placeholderTextColor={c.muted}
          style={s.search}
          returnKeyType="search"
          autoCorrect={false}
        />
        <View style={s.filters}>
          {(
            [
              ["", "All"],
              ["unread", "To read"],
              ["reading", "Reading"],
              ["read", "Read"],
            ] as const
          ).map(([value, label]) => (
            <Pressable
              key={value}
              accessibilityRole="radio"
              accessibilityState={{ checked: status === value }}
              onPress={() => setStatus(value)}
              style={[s.filter, status === value && s.filterActive]}
            >
              <Text
                style={[s.filterText, status === value && { color: c.accent }]}
              >
                {label}
              </Text>
            </Pressable>
          ))}
        </View>
        <View style={s.sortLine}>
          <Text style={s.caption}>
            {loading
              ? "Finding your books…"
              : `${data?.total ?? 0} ${data?.total === 1 ? "book" : "books"}${query || status ? " found" : " tucked away"}`}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Choose sort order"
            accessibilityState={{ expanded: showSort }}
            onPress={() => setShowSort(!showSort)}
            style={s.sortToggle}
          >
            <Text style={s.caption}>
              {sorts.find(([v]) => v === sort)?.[1]} {showSort ? "↑" : "↓"}
            </Text>
          </Pressable>
        </View>
        {showSort && (
          <View style={s.sortOptions}>
            {sorts.map(([value, label]) => (
              <Pressable
                key={value}
                accessibilityRole="radio"
                accessibilityState={{ checked: sort === value }}
                onPress={() => {
                  setSort(value);
                  setShowSort(false);
                }}
                style={s.sortOption}
              >
                <Text style={{ color: sort === value ? c.accent : c.text }}>
                  {label}
                  {sort === value ? " ✓" : ""}
                </Text>
              </Pressable>
            ))}
          </View>
        )}
        {loading ? (
          <View style={s.feedback}>
            <ActivityIndicator color={c.accent} />
            <Text style={s.intro}>Making room on the shelf…</Text>
          </View>
        ) : error ? (
          <View style={s.feedback}>
            <Text style={s.sectionTitle}>
              Your books haven’t gone anywhere.
            </Text>
            <Text style={s.intro}>{error}</Text>
            <Pressable
              accessibilityRole="button"
              style={s.action}
              onPress={() => setRevision((n) => n + 1)}
            >
              <Text style={{ color: c.accent }}>Try again</Text>
            </Pressable>
          </View>
        ) : rows.length ? (
          rows.map((row, index) => (
            <View key={index} style={s.shelfRow}>
              <View style={s.shelfLine} />
              {row.map((item) => (
                <Pressable
                  key={item.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Open ${item.title}`}
                  onPress={() => setSelected(item)}
                  style={({ pressed }) => [s.book, pressed && { opacity: 0.7 }]}
                >
                  <View style={s.coverSpace}>
                    <BookJacket title={item.title} cover={item.cover_url} />
                  </View>
                  <View style={s.catalogLabel}>
                    <Text numberOfLines={2} style={s.bookTitle}>
                      {item.title}
                    </Text>
                    <Text numberOfLines={1} style={s.author}>
                      {item.authors.join(", ") || "Author unknown"}
                    </Text>
                    <Text style={s.bookStatus}>
                      {item.reading_status === "read"
                        ? "✓  READ"
                        : item.reading_status === "reading"
                          ? "◒  READING"
                          : "○  TO READ"}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </View>
          ))
        ) : (
          <View style={s.feedback}>
            <Text style={s.sectionTitle}>
              {query || status
                ? "No books on this shelf yet."
                : "Every library starts with one book."}
            </Text>
            <Text style={s.intro}>
              {query || status
                ? "Try another search or reading status."
                : "Pick a book you love. We’ll keep its place here."}
            </Text>
            <Pressable
              accessibilityRole="button"
              style={s.action}
              onPress={() => {
                if (query || status) {
                  setQuery("");
                  setStatus("");
                } else onScan();
              }}
            >
              <Text style={{ color: c.accent }}>
                {query || status ? "Clear filters" : "Add your first book"}
              </Text>
            </Pressable>
          </View>
        )}
        <Text style={s.footer}>A place for the books that stay with you.</Text>
      </ScrollView>
      {selected && (
        <LibraryCardDetail
          key={selected.id}
          item={selected}
          onClose={() => setSelected(null)}
          onChanged={() => setRevision((n) => n + 1)}
        />
      )}
    </SafeAreaView>
  );
}
const styles = (c: Colors) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.background },
    content: {
      padding: 22,
      paddingBottom: 28,
      width: "100%",
      maxWidth: 680,
      alignSelf: "center",
    },
    masthead: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      borderBottomWidth: 1,
      borderColor: c.border,
      paddingBottom: 16,
    },
    brand: {
      fontFamily: serif,
      fontSize: 36,
      color: c.text,
      letterSpacing: -2,
    },
    edition: {
      fontFamily: mono,
      fontSize: 8,
      letterSpacing: 1,
      color: c.muted,
    },
    hero: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 24,
      gap: 6,
    },
    heroCopy: { flex: 1 },
    eyebrow: {
      fontFamily: mono,
      fontSize: 8,
      letterSpacing: 1,
      color: c.accent,
      marginBottom: 12,
    },
    heading: { fontFamily: serif, fontSize: 30, lineHeight: 36, color: c.text },
    intro: { color: c.muted, fontSize: 13, lineHeight: 20, marginTop: 10 },
    scan: {
      backgroundColor: c.accent,
      paddingHorizontal: 18,
      minHeight: 48,
      borderRadius: 5,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    scanText: { color: c.onAccent, fontSize: 15, fontWeight: "600" },
    stats: {
      backgroundColor: c.paper,
      flexDirection: "row",
      paddingVertical: 15,
      marginTop: 18,
      borderRadius: 3,
    },
    stat: { flex: 1, alignItems: "center" },
    number: { fontFamily: serif, fontSize: 24, color: c.ink },
    statLabel: { fontSize: 10, marginTop: 4, color: "#53604B" },
    section: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginTop: 28,
      marginBottom: 16,
    },
    sectionTitle: { fontFamily: serif, fontSize: 24, color: c.text },
    star: { color: c.accent, fontSize: 25 },
    search: {
      minHeight: 48,
      borderRadius: 5,
      borderWidth: 1,
      borderColor: c.border,
      color: c.text,
      backgroundColor: c.panel,
      paddingHorizontal: 14,
      fontSize: 14,
    },
    filters: {
      flexDirection: "row",
      borderBottomWidth: 1,
      borderColor: c.border,
      marginTop: 10,
    },
    filter: {
      flex: 1,
      minHeight: 46,
      justifyContent: "center",
      alignItems: "center",
      borderBottomWidth: 2,
      borderColor: "transparent",
    },
    filterActive: { borderColor: c.accent },
    filterText: { fontSize: 12, color: c.muted },
    sortLine: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 14,
    },
    caption: { fontSize: 11, color: c.muted },
    sortToggle: { minHeight: 44, justifyContent: "center", paddingLeft: 12 },
    sortOptions: {
      backgroundColor: c.panel,
      borderWidth: 1,
      borderColor: c.border,
      padding: 8,
      marginBottom: 14,
    },
    sortOption: {
      minHeight: 44,
      justifyContent: "center",
      paddingHorizontal: 12,
    },
    shelfRow: { flexDirection: "row", gap: 22, marginBottom: 28 },
    shelfLine: {
      position: "absolute",
      left: -6,
      right: -6,
      top: 176,
      height: 6,
      backgroundColor: "#6B6A54",
      borderTopWidth: 1,
      borderTopColor: "#A29A7D",
      borderBottomWidth: 2,
      borderBottomColor: "#30382D",
    },
    book: { width: "46.5%" },
    coverSpace: {
      height: 176,
      alignItems: "center",
      justifyContent: "flex-end",
    },
    catalogLabel: {
      backgroundColor: c.paper,
      marginTop: 17,
      padding: 11,
      borderRadius: 2,
      minHeight: 102,
    },
    bookTitle: {
      fontFamily: serif,
      color: c.ink,
      fontSize: 15,
      lineHeight: 19,
    },
    author: { fontSize: 10, color: "#52604D", marginTop: 5 },
    bookStatus: {
      fontFamily: mono,
      fontSize: 8,
      color: "#52604D",
      marginTop: 12,
      letterSpacing: 0.4,
    },
    feedback: { paddingVertical: 35, alignItems: "center", gap: 8 },
    action: { minHeight: 48, padding: 14, justifyContent: "center" },
    footer: {
      textAlign: "center",
      fontFamily: serif,
      fontStyle: "italic",
      color: c.muted,
      fontSize: 13,
      marginTop: 4,
      marginBottom: 10,
    },
  });
