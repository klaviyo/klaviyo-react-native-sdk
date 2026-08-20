import type { ReactNode } from 'react';
import { View, type ViewProps } from 'react-native';
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

/**
 * Android safe-area strategy.
 *
 * Core `SafeAreaView` is effectively a plain `View` on Android, and apps
 * targeting SDK 35+ draw beneath the system bars, so insets have to be read
 * and applied manually. `react-native-safe-area-context` reports them as
 * `max(windowInsets - viewPosition, 0)`, which means it returns zero on
 * older Android versions where the system already reserves that space.
 *
 * See `safeArea.tsx` for the default (iOS) implementation and why iOS
 * deliberately does not use this library.
 */

/** Provides the inset context that `useSafeAreaPadding` reads from. */
export function SafeAreaRoot({ children }: { children: ReactNode }) {
  return <SafeAreaProvider>{children}</SafeAreaProvider>;
}

/**
 * Top-level screen container. A plain `View` — insets are applied by the
 * components that need them, so the header's background can still extend to
 * the screen edge while its controls clear the status bar.
 */
export function SafeAreaContainer(props: ViewProps) {
  return <View {...props} />;
}

/** Live safe-area insets for callers to fold into their own padding. */
export function useSafeAreaPadding() {
  return useSafeAreaInsets();
}
