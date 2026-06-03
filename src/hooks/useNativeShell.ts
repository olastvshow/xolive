import { useEffect } from 'react';
import { useRouter } from '@tanstack/react-router';

/**
 * Wires native shell behavior when running inside Capacitor (Android/iOS).
 * Capacitor modules are loaded dynamically inside the effect so SSR never
 * touches browser globals.
 */
export function useNativeShell() {
  const router = useRouter();

  useEffect(() => {
    let cleanup: (() => void) | undefined;
    let cancelled = false;

    (async () => {
      const [{ Capacitor }, { App: CapApp }, { StatusBar, Style }] = await Promise.all([
        import('@capacitor/core'),
        import('@capacitor/app'),
        import('@capacitor/status-bar'),
      ]);

      if (cancelled || !Capacitor.isNativePlatform()) return;

      StatusBar.setStyle({ style: Style.Dark }).catch(() => {});

      const subPromise = CapApp.addListener('backButton', ({ canGoBack }) => {
        if (canGoBack && window.history.length > 1) {
          router.history.back();
        } else {
          CapApp.exitApp();
        }
      });

      cleanup = () => {
        subPromise.then((s) => s.remove()).catch(() => {});
      };
    })().catch(() => {});

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [router]);
}
