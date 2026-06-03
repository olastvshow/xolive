import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { useRouter } from '@tanstack/react-router';

/**
 * Wires native shell behavior when running inside Capacitor (Android/iOS):
 * - Themes the status bar
 * - Maps Android hardware back button to in-app history, exits when no history
 * No-ops in a regular browser.
 */
export function useNativeShell() {
  const router = useRouter();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    StatusBar.setStyle({ style: Style.Dark }).catch(() => {});

    const sub = CapApp.addListener('backButton', ({ canGoBack }) => {
      if (canGoBack && window.history.length > 1) {
        router.history.back();
      } else {
        CapApp.exitApp();
      }
    });

    return () => {
      sub.then((s) => s.remove()).catch(() => {});
    };
  }, [router]);
}
