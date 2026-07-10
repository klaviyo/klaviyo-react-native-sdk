import { useLayoutEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Platform,
  StyleSheet,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { styles as sharedStyles } from '../Styles';
import { colors, spacing, typography, borderRadius } from '../theme';
import { SectionHeader } from '../components/SectionHeader';
import { ToggleButtons } from '../components/ToggleButtons';
import { TokenLifetimeSummary } from '../components/TokenLifetimeSummary';
import type { RootStackParamList } from '../navigation/types';
import {
  useAuth,
  getOutcomeKindLabel,
  type ProviderResponse,
  type ProviderOutcome,
  type MockTokenOutcome,
} from '../hooks/useAuth';
import { useNowMs } from '../hooks/useNowMs';
import { readJwtClaims, getTokenStatus } from '../auth/jwt';
import { MOCK_TOKEN_DURATION_PRESETS } from '../auth/mockToken';

type Props = NativeStackScreenProps<RootStackParamList, 'ConfigureResponse'>;

const OUTCOME_KINDS: ProviderOutcome['kind'][] = [
  'customToken',
  'mockToken',
  'networkError',
  'otherError',
];

/** Clamps a delay to the 0-10s range in 0.25s steps. */
function clampDelaySeconds(value: number): number {
  const clamped = Math.min(10, Math.max(0, value));
  return Math.round(clamped * 4) / 4;
}

/** Builds a default outcome of the requested kind (used when switching the outcome picker). */
function createOutcomeOfKind(kind: ProviderOutcome['kind']): ProviderOutcome {
  switch (kind) {
    case 'customToken':
      return { kind: 'customToken', token: '' };
    case 'mockToken':
      return {
        kind: 'mockToken',
        mockKind: 'valid',
        expirationMode: 'duration',
        durationSeconds: 90,
        expEpochMs: Date.now() + 90_000,
      };
    case 'networkError':
      return { kind: 'networkError' };
    case 'otherError':
      return { kind: 'otherError' };
  }
}

/**
 * Extracted to module scope (rather than defined inline in
 * `navigation.setOptions`) so the header-right *component type* stays
 * stable across renders — only the `onPress` closure changes.
 */
function HeaderDoneButton({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} hitSlop={8}>
      <Text style={styles.doneButton}>Done</Text>
    </TouchableOpacity>
  );
}

/** `YYYY-MM-DDTHH:mm` in local time, for the Date-mode text input. */
function toDateTimeLocalInputValue(epochMs: number): string {
  const d = new Date(epochMs);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function parseDateTimeLocalInputValue(value: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value.trim());
  if (!match) {
    return null;
  }
  const [, y, mo, d, h, mi] = match;
  if (!y || !mo || !d || !h || !mi) {
    return null;
  }
  const date = new Date(
    Number(y),
    Number(mo) - 1,
    Number(d),
    Number(h),
    Number(mi)
  );
  return Number.isNaN(date.getTime()) ? null : date.getTime();
}

/**
 * MAGE-794/MAGE-879 Screen 2 — Configure Response. Edits a single scripted
 * response as a local draft; the header "Done" button commits it back to
 * the shared `useAuth` engine (picked up on the provider's next call — no
 * re-register needed).
 */
export function ConfigureResponseScreen({ route, navigation }: Props) {
  const auth = useAuth();
  const original = auth.getResponse(route.params.responseId);
  const nowMs = useNowMs(1000);
  const nowSeconds = nowMs / 1000;

  const [draft, setDraft] = useState<ProviderResponse | null>(original ?? null);
  const [tokenRevealed, setTokenRevealed] = useState(false);
  // Raw text buffer for the Date-mode input, decoupled from the committed
  // `expEpochMs` so incomplete/in-progress keystrokes aren't clobbered by a
  // re-derived value on every render.
  const [dateInputText, setDateInputText] = useState<string | null>(null);

  useLayoutEffect(() => {
    const handleDone = () => {
      setDraft((current) => {
        if (current) {
          auth.updateResponse(current.id, current);
        }
        return current;
      });
      navigation.goBack();
    };

    navigation.setOptions({
      // This is React Navigation's documented `headerRight` render-prop
      // idiom: the wrapper arrow function is necessarily re-created so it
      // can close over the latest `handleDone`, but the component it
      // renders (`HeaderDoneButton`) is a stable, module-scope component.
      // eslint-disable-next-line react/no-unstable-nested-components
      headerRight: () => <HeaderDoneButton onPress={handleDone} />,
    });
    // Re-bind whenever the draft changes so Done always commits the latest edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigation, draft]);

  if (!draft) {
    return (
      <View style={[sharedStyles.container, styles.missingContainer]}>
        <Text style={styles.missingText}>
          This response no longer exists (it may have been deleted).
        </Text>
      </View>
    );
  }

  function selectOutcomeKind(kind: ProviderOutcome['kind']) {
    setDraft((prev) =>
      prev ? { ...prev, outcome: createOutcomeOfKind(kind) } : prev
    );
  }

  function updateMockOutcome(patch: Partial<Omit<MockTokenOutcome, 'kind'>>) {
    setDraft((prev) => {
      if (!prev || prev.outcome.kind !== 'mockToken') {
        return prev;
      }
      return { ...prev, outcome: { ...prev.outcome, ...patch } };
    });
  }

  function updateDelaySeconds(seconds: number) {
    setDraft((prev) =>
      prev ? { ...prev, delaySeconds: clampDelaySeconds(seconds) } : prev
    );
  }

  const outcome = draft.outcome;

  return (
    <ScrollView
      style={sharedStyles.container}
      contentContainerStyle={sharedStyles.scrollContent}
    >
      <View style={sharedStyles.section}>
        <SectionHeader title="Outcome" />
        <View style={styles.pillRow}>
          {OUTCOME_KINDS.map((kind) => (
            <TouchableOpacity
              key={kind}
              style={[styles.pill, outcome.kind === kind && styles.pillActive]}
              onPress={() => selectOutcomeKind(kind)}
            >
              <Text
                style={[
                  styles.pillText,
                  outcome.kind === kind && styles.pillTextActive,
                ]}
              >
                {getOutcomeKindLabel(kind)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {outcome.kind === 'customToken' && (
        <View style={sharedStyles.section}>
          <SectionHeader title="Custom token" />
          <View style={styles.secureFieldRow}>
            <TextInput
              style={[
                styles.secureInput,
                tokenRevealed && styles.secureInputRevealed,
              ]}
              value={outcome.token}
              onChangeText={(text) =>
                setDraft((prev) =>
                  prev && prev.outcome.kind === 'customToken'
                    ? { ...prev, outcome: { kind: 'customToken', token: text } }
                    : prev
                )
              }
              secureTextEntry={!tokenRevealed}
              autoCapitalize="none"
              autoCorrect={false}
              multiline
              placeholder="Paste a JWT"
              placeholderTextColor={colors.placeholderText}
            />
            <TouchableOpacity
              onPress={() => setTokenRevealed((prev) => !prev)}
              hitSlop={8}
            >
              <Text style={styles.eyeToggle}>
                {tokenRevealed ? 'Hide' : 'Show'}
              </Text>
            </TouchableOpacity>
          </View>
          <TokenLifetimeSummary
            status={getTokenStatus(outcome.token)}
            claims={readJwtClaims(outcome.token)}
            nowSeconds={nowSeconds}
          />
        </View>
      )}

      {outcome.kind === 'mockToken' && (
        <View style={sharedStyles.section}>
          <SectionHeader title="Mock token" />
          <ToggleButtons
            leftLabel="Valid token"
            rightLabel="Malformed token"
            isLeftActive={outcome.mockKind === 'valid'}
            onLeftPress={() => updateMockOutcome({ mockKind: 'valid' })}
            onRightPress={() => updateMockOutcome({ mockKind: 'malformed' })}
          />

          {outcome.mockKind === 'valid' && (
            <>
              <View style={styles.spacerSm} />
              <ToggleButtons
                leftLabel="Duration"
                rightLabel="Date"
                isLeftActive={outcome.expirationMode === 'duration'}
                onLeftPress={() =>
                  updateMockOutcome({ expirationMode: 'duration' })
                }
                onRightPress={() =>
                  updateMockOutcome({ expirationMode: 'date' })
                }
              />

              {outcome.expirationMode === 'duration' ? (
                <View style={styles.pillRow}>
                  {MOCK_TOKEN_DURATION_PRESETS.map((preset) => {
                    const isActive = outcome.durationSeconds === preset.seconds;
                    return (
                      <TouchableOpacity
                        key={preset.label}
                        style={[styles.pill, isActive && styles.pillActive]}
                        onPress={() =>
                          updateMockOutcome({ durationSeconds: preset.seconds })
                        }
                      >
                        <Text
                          style={[
                            styles.pillText,
                            isActive && styles.pillTextActive,
                            preset.seconds < 0 && styles.expiredPresetText,
                          ]}
                        >
                          {preset.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ) : (
                <View style={styles.dateFieldContainer}>
                  <Text style={styles.fieldLabel}>Expires at (local time)</Text>
                  <TextInput
                    style={styles.dateInput}
                    value={
                      dateInputText ??
                      toDateTimeLocalInputValue(outcome.expEpochMs)
                    }
                    onChangeText={(text) => {
                      setDateInputText(text);
                      const parsed = parseDateTimeLocalInputValue(text);
                      if (parsed != null) {
                        updateMockOutcome({ expEpochMs: parsed });
                      }
                    }}
                    placeholder="YYYY-MM-DDTHH:mm"
                    placeholderTextColor={colors.placeholderText}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
              )}

              <Text style={styles.previewLabel}>Token lifetime preview</Text>
              <TokenLifetimeSummary
                status="well-formed"
                claims={{
                  iat: Math.floor(Date.now() / 1000),
                  exp:
                    outcome.expirationMode === 'duration'
                      ? Math.floor(Date.now() / 1000) + outcome.durationSeconds
                      : Math.floor(outcome.expEpochMs / 1000),
                }}
                nowSeconds={nowSeconds}
              />
            </>
          )}
        </View>
      )}

      {outcome.kind === 'networkError' && (
        <View style={sharedStyles.section}>
          <SectionHeader title="Throw network error" />
          <Text style={styles.helperText}>
            Rejects with a connectivity marker (
            {
              "Object.assign(new Error('offline'), { isConnectivityError: true })"
            }
            ), so the SDK arms its connectivity-driven refresh retry.
          </Text>
        </View>
      )}

      {outcome.kind === 'otherError' && (
        <View style={sharedStyles.section}>
          <SectionHeader title="Throw other error" />
          <Text style={styles.helperText}>
            Rejects with a plain (non-connectivity) error — the SDK will not arm
            a connectivity-driven retry for this outcome.
          </Text>
        </View>
      )}

      <View style={sharedStyles.section}>
        <SectionHeader title="Delay" />
        <View style={styles.delayRow}>
          <TouchableOpacity
            style={styles.stepperButton}
            onPress={() => updateDelaySeconds(draft.delaySeconds - 0.25)}
            disabled={draft.delaySeconds <= 0}
            hitSlop={8}
          >
            <Text style={styles.stepperButtonText}>−</Text>
          </TouchableOpacity>
          <Text style={styles.delayValue}>
            {draft.delaySeconds.toFixed(2)}s
          </Text>
          <TouchableOpacity
            style={styles.stepperButton}
            onPress={() => updateDelaySeconds(draft.delaySeconds + 0.25)}
            disabled={draft.delaySeconds >= 10}
            hitSlop={8}
          >
            <Text style={styles.stepperButtonText}>+</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  doneButton: {
    ...typography.button,
    color: colors.primary,
    paddingHorizontal: spacing.sm,
  },
  missingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  missingText: {
    ...typography.body,
    color: colors.secondaryText,
    textAlign: 'center',
  },

  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  pill: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.smmd,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cardBackground,
  },
  pillActive: {
    borderColor: colors.primary,
    backgroundColor: colors.activeButtonTint,
  },
  pillText: {
    ...typography.label,
    color: colors.text,
  },
  pillTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  expiredPresetText: {
    color: colors.destructive,
  },

  secureFieldRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  secureInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
    minHeight: 44,
    color: colors.text,
  },
  secureInputRevealed: {
    fontFamily: Platform.select({ ios: 'Courier', android: 'monospace' }),
    fontSize: 13,
  },
  eyeToggle: {
    ...typography.label,
    color: colors.primary,
    paddingVertical: spacing.sm,
  },

  spacerSm: {
    height: spacing.sm,
  },
  dateFieldContainer: {
    marginTop: spacing.sm,
  },
  fieldLabel: {
    ...typography.label,
    color: colors.secondaryText,
    marginBottom: spacing.xs,
  },
  dateInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
    color: colors.text,
    fontFamily: Platform.select({ ios: 'Courier', android: 'monospace' }),
  },
  previewLabel: {
    ...typography.label,
    color: colors.secondaryText,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },

  helperText: {
    ...typography.body,
    color: colors.secondaryText,
  },

  delayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.mdlg,
  },
  stepperButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperButtonText: {
    fontSize: 20,
    color: colors.primary,
  },
  delayValue: {
    ...typography.body,
    color: colors.text,
    minWidth: 64,
    textAlign: 'center',
  },
});
