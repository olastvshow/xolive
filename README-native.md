# Building the XO Live Android app (Capacitor)

This project is wrapped with [Capacitor](https://capacitorjs.com) so you can ship it
as a native Android app. The native Android project itself is NOT committed —
Capacitor generates it on your machine. You'll need:

- Node.js 20+ and `npm` (or `bun`)
- **Android Studio** (Hedgehog or newer) with the Android SDK + an emulator or a USB device
- **JDK 17** (Android Studio ships one; set `JAVA_HOME` to it)

## One-time setup (on your local machine)

```bash
# 1. Pull the repo from GitHub (use the "Export to GitHub" button in Lovable first)
git clone <your-repo-url>
cd <your-repo>

# 2. Install JS deps
npm install

# 3. Build the web bundle (Capacitor copies this into the native app)
npm run build

# 4. Generate the native Android project (creates /android folder)
npx cap add android

# 5. Sync web build + plugins into the native project
npx cap sync android
```

## Running on a device / emulator

```bash
# Open Android Studio with the project
npx cap open android
```

Then press the green ▶ in Android Studio. Or, if you have an emulator/device
attached and the `adb` CLI in your PATH:

```bash
npx cap run android
```

## Dev mode (live reload from Lovable preview)

`capacitor.config.ts` ships with a `server.url` pointing at the Lovable preview.
That means the installed APK loads the **live** web app — every change you push
in Lovable shows up the next time the app opens, no rebuild needed. Great for
iterating on UI.

## Production build (App Store / Play Store ready)

Before shipping a release build, switch off live-reload so the app bundles
its own JS:

1. Edit `capacitor.config.ts` and **remove the `server` block** entirely.
2. Rebuild and sync:
   ```bash
   npm run build
   npx cap sync android
   ```
3. In Android Studio: **Build → Generate Signed App Bundle / APK**, follow the
   wizard to create a keystore, and upload the resulting `.aab` to Google Play.

## After pulling new web changes

```bash
npm run build && npx cap sync android
```

(Only needed for production / bundled mode. In live-reload dev mode the app
fetches from the preview URL automatically.)

## Troubleshooting

- **White screen on launch** — your dev machine and phone must be on the same
  network if loading from `localhost`. The Lovable preview URL works from any
  network.
- **"SDK location not found"** — open Android Studio → SDK Manager and let it
  install the SDK, then restart your terminal.
- **Gradle / JDK errors** — confirm `java -version` reports 17. Set
  `JAVA_HOME` to Android Studio's bundled JDK if needed.
