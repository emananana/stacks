import { Platform } from "react-native";
export const darkColors = {
  background: "#121615",
  panel: "#202522",
  text: "#F0EDE3",
  muted: "#A6ADA5",
  accent: "#C5D99B",
  border: "#3D453E",
  error: "#E7A38F",
  paper: "#E8E0CF",
  ink: "#1B2416",
  onAccent: "#1B2416",
  selected: "#263126",
  halo: "#222B23",
};
export type Colors = typeof darkColors;
export const lightColors: Colors = {
  background: "#F5F0E5",
  panel: "#EAE5D8",
  text: "#202D24",
  muted: "#59634F",
  accent: "#3E5A36",
  border: "#C2C7B5",
  error: "#9D4030",
  paper: "#E8E0CF",
  ink: "#1B2416",
  onAccent: "#FFF8E9",
  selected: "#DFE7D1",
  halo: "#E4E8D6",
};
export const mono = Platform.select({
  ios: "Menlo",
  android: "monospace",
  default: "monospace",
});
export const serif = Platform.select({
  ios: "Georgia",
  android: "serif",
  default: "Georgia",
});
