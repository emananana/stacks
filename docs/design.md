# Stacks: a little library after dark

The library opens first. Charcoal and sage frame the books in dark mode; cream and deep green provide a light alternative. Warm paper shelf labels retain the physical-library character in both modes. Detail cards follow the selected appearance. Georgia (native serif on Android) provides the bookish voice. Monospace is reserved for small catalog identifiers.

The Appearance control at the top of My Library offers Light, Dark, and System (the default). ThemeProvider follows device changes through useColorScheme and persists the preference locally with AsyncStorage. Screen styles are derived from shared semantic color tokens; cover art and illustrated materials retain their own colors. Storage failures are surfaced beside the control and the current-session preference still applies. Expo is configured for automatic system appearance.

Appearance verification: TypeScript including unused-local checks, Expo web export, phone-sized light library and lookup previews, dark detail preview, and preference persistence across reloads. On a physical phone, select System and change iOS appearance, check the status bar and detail back button, then choose a fixed mode and verify it survives reopening Expo Go.

ReadingLamp is a native-shape illustration, so it stays sharp without image downloads. BookJacket contains cover art without cropping and supplies a deterministic illustrated binding when a cover is absent or fails to load. Future personal drawings can replace the lamp without changing the layout.

Navigation occupies its own safe-area footer with 58-point minimum targets. Book details open in a full-screen modal with editable status, rating, location, acquired date, and notes. Unsaved changes and removal require an explicit choice. Successful updates display a small shelf stamp and request a success haptic.

Verification: TypeScript checking and Expo web export; browser previews at 390×844 and 320×700; real-library read-only rendering, search empty state, and unsaved-change confirmation. API smoke checks cover PATCH serialization, validation errors, empty HTTP 204 deletion responses, and backend CORS preflight. Physical-device keyboard, safe areas, haptics, and camera still need checking in Expo Go.
