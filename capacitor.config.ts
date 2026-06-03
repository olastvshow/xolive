import type { CapacitorConfig } from '@capacitor/cli';

// Live-reload during dev points the Android app at the Lovable preview URL.
// For a production build:
//   1. Comment out / remove the `server` block below
//   2. Run: npm run build && npx cap sync android
//   3. Build the release APK/AAB from Android Studio
const config: CapacitorConfig = {
  appId: 'app.lovable.xolive',
  appName: 'XO Live',
  webDir: 'dist',
  server: {
    url: 'https://id-preview--84551768-2cd6-4320-805e-d84b422a62c3.lovable.app?forceHideBadge=true',
    cleartext: true,
  },
  android: {
    allowMixedContent: true,
  },
  plugins: {
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#0F172A',
    },
  },
};

export default config;
