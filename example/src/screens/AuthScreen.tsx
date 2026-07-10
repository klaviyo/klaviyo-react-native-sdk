import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Switch,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { styles as sharedStyles } from '../Styles';
import { colors, spacing, typography, borderRadius } from '../theme';
import { SectionHeader } from '../components/SectionHeader';
import { ActionButton } from '../components/ActionButton';
import { BaseModal } from '../components/BaseModal';
import { TokenLifetimeSummary } from '../components/TokenLifetimeSummary';
import type { RootStackParamList } from '../navigation/types';
import {
  useAuth,
  getOutcomeLabel,
  isResponseLocked,
  canDeleteResponse,
  canMoveResponseUp,
  canMoveResponseDown,
  type ProviderResponse,
} from '../hooks/useAuth';
import { useNowMs } from '../hooks/useNowMs';
import { readJwtClaims, getTokenStatus } from '../auth/jwt';

function getResponseSubtitle(response: ProviderResponse): string {
  const parts: string[] = [];

  if (response.outcome.kind === 'customToken') {
    const status = getTokenStatus(response.outcome.token);
    parts.push(
      status === 'well-formed'
        ? 'Well-formed'
        : status === 'malformed'
          ? 'Malformed'
          : '--'
    );
  } else if (response.outcome.kind === 'mockToken') {
    parts.push(
      response.outcome.mockKind === 'malformed' ? 'Malformed' : 'Well-formed'
    );
  }

  if (response.delaySeconds > 0) {
    parts.push(`delay: ${response.delaySeconds}s`);
  }

  return parts.length > 0 ? parts.join(' · ') : '—';
}

/**
 * MAGE-794/MAGE-879 Screen 1 — the Auth screen. A scrolling form with four
 * sections: provider toggle, scripted provider responses, the current-token
 * summary, and an auth-diagnostics log viewer.
 */
export function AuthScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const auth = useAuth();
  const nowMs = useNowMs(1000);
  const [explainerVisible, setExplainerVisible] = useState(false);

  const claims = auth.lastReturnedToken
    ? readJwtClaims(auth.lastReturnedToken)
    : null;
  const tokenStatus = getTokenStatus(auth.lastReturnedToken ?? '');
  const nowSeconds = nowMs / 1000;

  return (
    <ScrollView
      style={sharedStyles.container}
      contentContainerStyle={sharedStyles.scrollContent}
    >
      {/* 1. Provider toggle */}
      <View style={sharedStyles.section}>
        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>Auth token provider</Text>
          <Switch
            value={auth.providerEnabled}
            onValueChange={auth.toggleProvider}
          />
        </View>
        <Text style={styles.footerText}>
          {auth.providerEnabled
            ? 'Next flip calls Klaviyo.unregisterAuthTokenProvider()'
            : 'Next flip calls Klaviyo.registerAuthTokenProvider() (registers an eager fetch)'}
        </Text>
      </View>

      {/* 2. Provider responses */}
      <View style={sharedStyles.section}>
        <SectionHeader title="Provider responses" />
        {auth.responses.map((response, index) => {
          const served = auth.isServed(response.id);
          const locked = isResponseLocked(index, auth.responses.length, served);
          const canDelete = canDeleteResponse(served);
          const canMoveUp = canMoveResponseUp(index, auth.firstMovableIndex);
          const canMoveDown = canMoveResponseDown(
            index,
            auth.responses.length,
            auth.firstMovableIndex
          );
          const isLast = index === auth.responses.length - 1;
          const isCurrent = auth.currentCallId === response.id;

          return (
            <View
              key={response.id}
              style={[styles.responseRow, locked && styles.responseRowLocked]}
            >
              <TouchableOpacity
                style={styles.responseRowMain}
                disabled={locked}
                onPress={() =>
                  navigation.navigate('ConfigureResponse', {
                    responseId: response.id,
                  })
                }
              >
                <View style={styles.responseRowHeader}>
                  {isCurrent && <View style={styles.currentDot} />}
                  <Text style={styles.responseRowTitle} numberOfLines={1}>
                    {`Call ${index + 1}${isLast ? '+' : ''} — ${getOutcomeLabel(response.outcome)}`}
                  </Text>
                  {isLast && (
                    <View style={styles.repeatsBadge}>
                      <Text style={styles.repeatsBadgeText}>repeats</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.responseRowSubtitle}>
                  {getResponseSubtitle(response)}
                </Text>
              </TouchableOpacity>
              <View style={styles.responseRowActions}>
                <TouchableOpacity
                  disabled={!canMoveUp}
                  onPress={() => auth.moveResponseUp(response.id)}
                  hitSlop={8}
                >
                  <Text
                    style={[
                      styles.actionIcon,
                      !canMoveUp && styles.actionIconDisabled,
                    ]}
                  >
                    {'▲'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  disabled={!canMoveDown}
                  onPress={() => auth.moveResponseDown(response.id)}
                  hitSlop={8}
                >
                  <Text
                    style={[
                      styles.actionIcon,
                      !canMoveDown && styles.actionIconDisabled,
                    ]}
                  >
                    {'▼'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  disabled={locked}
                  onPress={() => auth.duplicateResponse(response.id)}
                  hitSlop={8}
                >
                  <Text
                    style={[
                      styles.actionIcon,
                      locked && styles.actionIconDisabled,
                    ]}
                  >
                    {'⧉'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  disabled={!canDelete}
                  onPress={() => auth.deleteResponse(response.id)}
                  hitSlop={8}
                >
                  <Text
                    style={[
                      styles.actionIcon,
                      styles.deleteIcon,
                      !canDelete && styles.actionIconDisabled,
                    ]}
                  >
                    {'✕'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
        <ActionButton
          title="Add response"
          onPress={auth.addResponse}
          withTopSpacing
        />
      </View>

      {/* 3. Current token */}
      <View style={sharedStyles.section}>
        <SectionHeader title="Current token" />
        <TokenLifetimeSummary
          status={tokenStatus}
          claims={claims}
          nowSeconds={nowSeconds}
          onInfoPress={() => setExplainerVisible(true)}
        />
      </View>

      {/* 4. Auth logs */}
      <View style={sharedStyles.section}>
        <SectionHeader title="Auth logs" />
        <Text style={styles.logsNote}>
          These are the wrapper&apos;s JS-side bridge diagnostics, not the
          native SDK&apos;s own &quot;Auth&quot;-category logs.
        </Text>
        {auth.logs.length === 0 ? (
          <Text style={styles.emptyStateText}>
            No Auth logs yet. Enable the provider to generate some.
          </Text>
        ) : (
          auth.logs.map((log) => (
            <View key={log.id} style={styles.logRow}>
              <Text style={styles.logTimestamp}>
                {new Date(log.timestampMs).toLocaleTimeString()}
              </Text>
              <Text
                style={[
                  styles.logMessage,
                  log.level === 'error' && styles.errorText,
                  log.level === 'debug' && styles.dimmedText,
                ]}
              >
                {log.message}
              </Text>
            </View>
          ))
        )}
        <ActionButton
          title="Clear"
          onPress={auth.clearLogs}
          withTopSpacing
          disabled={auth.logs.length === 0}
        />
      </View>

      <BaseModal
        visible={explainerVisible}
        onClose={() => setExplainerVisible(false)}
        title="Refresh estimate"
      >
        <Text style={styles.explainerText}>
          Mirrors the SDK&apos;s proactive-refresh target: roughly 90% of the
          token&apos;s lifetime after issuance, floored 30 seconds before
          expiry, and never sooner than 5 seconds after issuance. It&apos;s
          computed from this token&apos;s own {'iat'}/{'exp'} claims, so
          it&apos;s exact for normal-lifetime tokens and only approximate for
          pathologically short or old ones.
        </Text>
        <ActionButton
          title="Close"
          onPress={() => setExplainerVisible(false)}
          withTopSpacing
        />
      </BaseModal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleLabel: {
    ...typography.body,
    fontWeight: '600',
    color: colors.text,
  },
  footerText: {
    ...typography.label,
    color: colors.secondaryText,
    marginTop: spacing.sm,
  },

  responseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.smmd,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  responseRowLocked: {
    opacity: 0.5,
  },
  responseRowMain: {
    flex: 1,
    marginRight: spacing.sm,
  },
  responseRowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  currentDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginRight: spacing.xs,
  },
  responseRowTitle: {
    ...typography.body,
    color: colors.text,
    flexShrink: 1,
  },
  responseRowSubtitle: {
    ...typography.label,
    color: colors.secondaryText,
    marginTop: 2,
  },
  repeatsBadge: {
    marginLeft: spacing.xs,
    paddingHorizontal: spacing.xs,
    paddingVertical: 1,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.activeButtonTint,
  },
  repeatsBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primary,
  },
  responseRowActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  actionIcon: {
    fontSize: 16,
    color: colors.primary,
    paddingHorizontal: spacing.xs / 2,
  },
  actionIconDisabled: {
    color: colors.disabled,
  },
  deleteIcon: {
    color: colors.destructive,
  },

  errorText: {
    color: colors.destructive,
  },
  dimmedText: {
    color: colors.secondaryText,
    opacity: 0.7,
  },

  logsNote: {
    ...typography.label,
    fontSize: 12,
    fontStyle: 'italic',
    color: colors.secondaryText,
    marginBottom: spacing.sm,
  },
  emptyStateText: {
    ...typography.body,
    color: colors.secondaryText,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: spacing.md,
  },
  logRow: {
    flexDirection: 'row',
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.sm,
  },
  logTimestamp: {
    fontSize: 11,
    color: colors.secondaryText,
    fontFamily: 'monospace',
    minWidth: 64,
  },
  logMessage: {
    ...typography.label,
    color: colors.text,
    flex: 1,
  },

  explainerText: {
    ...typography.body,
    color: colors.text,
  },
});
