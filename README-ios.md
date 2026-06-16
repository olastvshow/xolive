# Building the XO Live iOS app (Capacitor)

The native iOS project is generated locally — it isn't committed.

## One-time setup (macOS required)

```bash
git clone <your-repo-url>
cd <your-repo>
npm install
npm run build
npx cap add ios
npx cap sync ios
```

## REQUIRED: Info.plist permissions (fixes App Store crash)

Apple rejected the app because it crashed when a reviewer tapped
**Profile → Camera → Upload your photo → Take Photo**. The cause is missing
iOS permission strings. Without them, iOS instantly terminates the app the
moment WKWebView asks for the camera.

Open `ios/App/App/Info.plist` in Xcode (or any editor) and add the following
keys inside the top-level `<dict>`:

```xml
<key>NSCameraUsageDescription</key>
<string>XO Live uses the camera so you can take a profile photo and join live video matches.</string>

<key>NSPhotoLibraryUsageDescription</key>
<string>XO Live needs access to your photos so you can pick a profile picture.</string>

<key>NSPhotoLibraryAddUsageDescription</key>
<string>XO Live saves screenshots from your matches to your photo library.</string>

<key>NSMicrophoneUsageDescription</key>
<string>XO Live uses the microphone for live voice and video matches.</string>
```

All four keys are required — `NSCameraUsageDescription` alone is not enough,
because the iOS photo picker also touches the photo library and microphone
permissions are needed for live video matches.

After editing, run:

```bash
npm run build && npx cap sync ios
```

Then open Xcode (`npx cap open ios`), archive, and upload the new build to
App Store Connect.

## Production build

1. In `capacitor.config.ts`, remove the `server` block so the app bundles
   its own JS instead of loading the Lovable preview.
2. `npm run build && npx cap sync ios`
3. In Xcode: **Product → Archive**, then **Distribute App → App Store Connect**.

## Support URL for App Store Connect

Use: **https://xolive.lovable.app/support**

That page lists a contact email, FAQs, and links to Privacy & Terms — which is
what Apple's Guideline 1.5 requires.
