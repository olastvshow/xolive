# Building XO Live as a native app (Capacitor)

XO Live is wrapped with [Capacitor](https://capacitorjs.com), so the same web
codebase ships as a native **Android** and **iOS** app. Capacitor renders the
app inside a native WebView (`WKWebView` on iOS, Chrome WebView on Android)
and exposes native APIs through plugins.

The native `android/` and `ios/` folders are NOT committed — Capacitor
generates them on your machine. Workflow:

1. Push this project to GitHub (use **Export to GitHub** in Lovable)
2. `git clone` it locally
3. Add the platform you want and build

---

## Android

Requirements: **Android Studio** (Hedgehog+), Android SDK, JDK 17.
Works on macOS, Windows, or Linux.

```bash
npm install
npm run build
npx cap add android
npx cap sync android
npx cap open android        # opens Android Studio
# or
npx cap run android         # builds & launches on connected device/emulator
```

## iOS

Requirements: **macOS** (mandatory — Apple toolchain), **Xcode 15+**,
**CocoaPods** (`sudo gem install cocoapods` or `brew install cocoapods`),
and an Apple Developer account for device/App Store builds (simulator
works without one).

```bash
npm install
npm run build
npx cap add ios
npx cap sync ios
npx cap open ios            # opens Xcode
# or
npx cap run ios             # builds & launches on simulator/device
```

In Xcode: select a target device/simulator and hit ▶. For TestFlight /
App Store, use **Product → Archive**.

### What "native" means here

Both platforms run your existing React app inside a native WebView — no
rewrite, no Swift/Kotlin needed. You get:

- App icon on the home screen, standalone window (no browser UI)
- Native status bar, splash screen, hardware back button (Android)
- Access to native APIs through Capacitor plugins (camera, push,
  geolocation, biometrics, etc. — install per plugin as needed)

The WebView is modern and standards-compliant (`WKWebView` is the same
engine as Safari). Performance is on par with a regular web app; UI
animations, WebSockets, Supabase realtime — everything works.

---

## Dev mode vs production builds

`capacitor.config.ts` currently includes a `server.url` pointing to the
Lovable preview. With this on, the installed app fetches the live web app
on every launch — push a change in Lovable, reopen the app, see it
update. Ideal for iteration; required to be **removed** for the store.

**Before submitting to the App Store / Play Store:**

1. Open `capacitor.config.ts` and delete the entire `server` block.
2. Rebuild and sync:
   ```bash
   npm run build
   npx cap sync          # syncs both android and ios if present
   ```
3. Archive/sign in Xcode (iOS) or Android Studio (Android) and upload.

---

## After pulling new web changes

```bash
npm run build && npx cap sync
```

Only needed in bundled mode. Live-reload mode picks up changes on its own.

---

## Troubleshooting

- **iOS "command not found: pod"** — install CocoaPods.
- **iOS code-signing errors** — open the project in Xcode, go to
  **Signing & Capabilities**, pick your team. Simulator builds don't
  require signing.
- **Android "SDK location not found"** — install the SDK via Android
  Studio's SDK Manager, then restart your terminal.
- **White screen on launch** — confirm `npm run build` succeeded and that
  `webDir` in `capacitor.config.ts` matches your build output (`dist`).
