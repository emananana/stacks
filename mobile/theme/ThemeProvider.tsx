import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useColorScheme } from "react-native";
import { darkColors, lightColors, type Colors } from "./tokens";

export type AppearancePreference = "system" | "light" | "dark";
const storageKey = "stacks.appearance.v1";
type Theme = {
  colors: Colors;
  isDark: boolean;
  preference: AppearancePreference;
  setPreference: (value: AppearancePreference) => void;
  storageError: string | null;
};
const ThemeContext = createContext<Theme | null>(null);
export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme();
  const [preference, updatePreference] =
    useState<AppearancePreference>("system");
  const [storageError, setStorageError] = useState<string | null>(null);
  const changed = useRef(false);
  const writes = useRef(Promise.resolve());
  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(storageKey)
      .then((value) => {
        if (
          active &&
          !changed.current &&
          (value === "light" || value === "dark" || value === "system")
        )
          updatePreference(value);
      })
      .catch(() => {
        if (active)
          setStorageError(
            "Couldn’t load your saved appearance. You can choose it again.",
          );
      });
    return () => {
      active = false;
    };
  }, []);
  const isDark =
    preference === "system" ? system === "dark" : preference === "dark";
  function setPreference(value: AppearancePreference) {
    changed.current = true;
    updatePreference(value);
    setStorageError(null);
    // Serialize writes so rapid taps cannot persist an older choice last.
    writes.current = writes.current
      .then(() => AsyncStorage.setItem(storageKey, value))
      .then(() => setStorageError(null))
      .catch(() =>
        setStorageError(
          "Appearance changed, but couldn’t be saved. Tap your choice to retry.",
        ),
      );
  }
  return (
    <ThemeContext.Provider
      value={{
        colors: isDark ? darkColors : lightColors,
        isDark,
        preference,
        setPreference,
        storageError,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}
export function useTheme() {
  const value = useContext(ThemeContext);
  if (!value) throw new Error("useTheme must be used within ThemeProvider");
  return value;
}
export function useThemedStyles<T>(factory: (colors: Colors) => T) {
  const { colors } = useTheme();
  return useMemo(() => factory(colors), [colors, factory]);
}
