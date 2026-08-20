import type { ReactNode } from 'react';
import { SafeAreaView, type ViewProps } from 'react-native';

/**
 * Default safe-area strategy — used on iOS and any non-Android platform.
 *
 * iOS never had the overlap bug this module exists to solve: React Native's
 * core `SafeAreaView` applies real insets there. Keeping iOS on it has a
 * second benefit — the iOS bundle never imports `react-native-safe-area-context`,
 * whose entry point eagerly calls `getConstants()` at import time (a
 * synchronous main-queue round-trip during bundle evaluation). That call
 * re-times startup, and doing it before the module-scope `Klaviyo.initialize()`
 * in App.tsx caused an abort on launch on iOS.
 *
 * Android's implementation lives in `safeArea.android.tsx`.
 */

/** No manual padding is needed where the platform already insets content. */
const ZERO_INSETS = { top: 0, right: 0, bottom: 0, left: 0 };

/**
 * Root wrapper, mounted above `App`. Core `SafeAreaView` reads insets from
 * UIKit directly, so no context provider is required here.
 */
export function SafeAreaRoot({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

/** Top-level screen container. Applies the platform safe area on iOS. */
export function SafeAreaContainer(props: ViewProps) {
  return <SafeAreaView {...props} />;
}

/**
 * Insets that callers should add to their own padding. Zero here, because
 * `SafeAreaContainer` has already inset the content.
 */
export function useSafeAreaPadding() {
  return ZERO_INSETS;
}
