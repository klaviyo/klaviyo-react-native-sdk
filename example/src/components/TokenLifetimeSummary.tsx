import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

import { colors, spacing, typography } from '../theme';
import type { JwtClaims, TokenStatus } from '../auth/jwt';
import { formatAbsoluteDateTime, formatDurationHms } from '../auth/format';
import { estimateRefreshTarget } from '../auth/refreshEstimate';

interface TokenLifetimeSummaryProps {
  status: TokenStatus;
  claims: JwtClaims | null;
  /** Current time, in seconds since the Unix epoch — pass a live-ticking value for real-time countdowns. */
  nowSeconds: number;
  /** Shows an info button next to "Refresh in" when provided (MAGE-794's refresh-estimate explainer). */
  onInfoPress?: () => void;
  /**
   * Overrides "Expires in" instead of deriving it from `claims.exp - nowSeconds`.
   * For the Configure Response screen's Duration-mode preview, where the
   * token's lifetime is fixed relative to whenever "Done" gets tapped (not
   * to the preview's current render time) — see `fixedRefreshInSeconds`.
   */
  fixedExpiresInSeconds?: number;
  /** Overrides "Refresh in" instead of deriving it from the refresh-target estimate minus `nowSeconds`. */
  fixedRefreshInSeconds?: number;
}

/**
 * Shared "Status / Expires / Expires in / Refresh in" summary rows, per
 * MAGE-794 §Screen 1 (Current token) and §Screen 2 (custom/mock token
 * summaries) — same shape, reused by both `AuthScreen` (for the
 * most-recently-returned token) and `ConfigureResponseScreen` (for a live
 * preview of the response being edited).
 */
export function TokenLifetimeSummary({
  status,
  claims,
  nowSeconds,
  onInfoPress,
  fixedExpiresInSeconds,
  fixedRefreshInSeconds,
}: TokenLifetimeSummaryProps) {
  const expiresInSeconds =
    fixedExpiresInSeconds !== undefined
      ? fixedExpiresInSeconds
      : claims?.exp != null
        ? claims.exp - nowSeconds
        : null;
  const refreshTargetSeconds =
    claims?.exp != null && claims?.iat != null
      ? estimateRefreshTarget(claims.iat, claims.exp)
      : null;
  const refreshInSeconds =
    fixedRefreshInSeconds !== undefined
      ? fixedRefreshInSeconds
      : refreshTargetSeconds != null
        ? refreshTargetSeconds - nowSeconds
        : null;

  return (
    <View>
      <View style={styles.row}>
        <Text style={styles.label}>Status</Text>
        <Text
          style={[
            styles.value,
            status === 'well-formed' && styles.success,
            status === 'malformed' && styles.error,
          ]}
        >
          {status === 'empty'
            ? '--'
            : status === 'well-formed'
              ? 'Well-formed'
              : 'Malformed'}
        </Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Expires</Text>
        <Text style={styles.value}>
          {claims?.exp != null ? formatAbsoluteDateTime(claims.exp) : '--'}
        </Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Expires in</Text>
        <Text
          style={[
            styles.value,
            expiresInSeconds != null && expiresInSeconds <= 0 && styles.error,
          ]}
        >
          {expiresInSeconds == null
            ? '--'
            : expiresInSeconds <= 0
              ? 'Expired'
              : formatDurationHms(expiresInSeconds)}
        </Text>
      </View>
      <View style={styles.row}>
        <View style={styles.refreshLabelRow}>
          <Text style={styles.label}>Refresh in</Text>
          {onInfoPress && (
            <TouchableOpacity onPress={onInfoPress} hitSlop={8}>
              <Text style={styles.infoIcon}>{'ⓘ'}</Text>
            </TouchableOpacity>
          )}
        </View>
        <Text
          style={[
            styles.value,
            refreshInSeconds != null && refreshInSeconds <= 0 && styles.warning,
          ]}
        >
          {refreshInSeconds == null
            ? '--'
            : refreshInSeconds <= 0
              ? 'Refresh due'
              : formatDurationHms(refreshInSeconds)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  label: {
    ...typography.label,
    color: colors.secondaryText,
  },
  value: {
    ...typography.body,
    color: colors.text,
  },
  refreshLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  infoIcon: {
    fontSize: 14,
    color: colors.secondaryText,
  },
  success: { color: colors.success },
  error: { color: colors.destructive },
  warning: { color: colors.warningBorder },
});
