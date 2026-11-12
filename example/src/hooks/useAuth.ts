import { useCallback, useMemo, useSyncExternalStore } from 'react';
import type { AuthTokenProvider } from 'klaviyo-react-native-sdk';
import { Klaviyo } from 'klaviyo-react-native-sdk';

import { MALFORMED_MOCK_TOKEN, mintMockJwt } from '../auth/mockToken';

/**
 * `useAuth` — the scripted auth-token provider engine for manual JWT testing
 * (MAGE-879 / MAGE-794 §Scripted provider engine).
 *
 * The engine's mutable state lives in a module-level singleton (not React
 * state) because it must be shared across the Auth screen and the Configure
 * Response screen: React Navigation's native-stack keeps the Auth screen
 * mounted underneath Configure Response, but a fresh `useState` per screen
 * would give each screen its own independent copy. `useSyncExternalStore`
 * subscribes React components to this singleton so edits made on Configure
 * Response are immediately visible to the Auth screen (and to the live
 * `scriptedProvider` closure the SDK calls), without prop-drilling a shared
 * store object through navigation params.
 *
 * Config (the scripted `responses` list) is intentionally transient —
 * in-memory only, reset on relaunch — matching the iOS reference, which
 * deliberately does not persist Auth state (contrast `useCompanyId`, which
 * persists to AsyncStorage).
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type MockTokenKind = 'valid' | 'malformed';
export type ExpirationMode = 'duration' | 'date';

export interface CustomTokenOutcome {
  kind: 'customToken';
  /** Returned to the SDK verbatim. */
  token: string;
}

export interface MockTokenOutcome {
  kind: 'mockToken';
  mockKind: MockTokenKind;
  /** Only meaningful when `mockKind === 'valid'`. */
  expirationMode: ExpirationMode;
  /** Seconds from time-of-serving. Used when `expirationMode === 'duration'`. May be negative (already expired). */
  durationSeconds: number;
  /** Absolute expiry instant, in epoch ms. Used when `expirationMode === 'date'`. */
  expEpochMs: number;
}

export interface NetworkErrorOutcome {
  kind: 'networkError';
}

export interface OtherErrorOutcome {
  kind: 'otherError';
}

export type ProviderOutcome =
  | CustomTokenOutcome
  | MockTokenOutcome
  | NetworkErrorOutcome
  | OtherErrorOutcome;

export interface ProviderResponse {
  /** Stable identity, surviving reorders — drives served/lock tracking. */
  id: string;
  /** 0-10s in 0.25s steps; the provider waits this long before resolving/rejecting. */
  delaySeconds: number;
  outcome: ProviderOutcome;
}

export type AuthLogLevel = 'debug' | 'warn' | 'error';

export interface AuthLogEntry {
  id: number;
  level: AuthLogLevel;
  message: string;
  timestampMs: number;
}

interface AuthEngineState {
  providerEnabled: boolean;
  responses: ProviderResponse[];
  servedIds: Set<string>;
  currentCallId: string | null;
  lastReturnedToken: string | null;
  logs: AuthLogEntry[];
  logsClearedBeforeId: number | null;
}

// ---------------------------------------------------------------------------
// Id generation
// ---------------------------------------------------------------------------

let responseIdCounter = 0;
function generateResponseId(): string {
  responseIdCounter += 1;
  return `resp-${responseIdCounter}-${Date.now().toString(36)}`;
}

// ---------------------------------------------------------------------------
// Defaults / labels
// ---------------------------------------------------------------------------

export function createDefaultResponse(): ProviderResponse {
  return {
    id: generateResponseId(),
    delaySeconds: 0,
    outcome: {
      kind: 'mockToken',
      mockKind: 'valid',
      expirationMode: 'duration',
      durationSeconds: 45,
      expEpochMs: Date.now() + 45_000,
    },
  };
}

/** Human-readable outcome labels, matching MAGE-794's exact row-label copy. */
const OUTCOME_KIND_LABELS: Record<ProviderOutcome['kind'], string> = {
  customToken: 'Return custom token',
  mockToken: 'Return mock token',
  networkError: 'Throw network error',
  otherError: 'Throw other error',
};

export function getOutcomeLabel(outcome: ProviderOutcome): string {
  return OUTCOME_KIND_LABELS[outcome.kind];
}

export function getOutcomeKindLabel(kind: ProviderOutcome['kind']): string {
  return OUTCOME_KIND_LABELS[kind];
}

// ---------------------------------------------------------------------------
// Lock helpers (exported for reuse by the Auth screen's row UI)
// ---------------------------------------------------------------------------

/**
 * Per MAGE-794: "Before the first provider call (and whenever the provider
 * is disabled), nothing is locked." So served-ness only has UI effect while
 * the provider is enabled.
 */
export function isServedEffective(
  id: string,
  providerEnabled: boolean,
  servedIds: ReadonlySet<string>
): boolean {
  return providerEnabled && servedIds.has(id);
}

/**
 * A response is locked (dimmed, non-tappable) once served — except the
 * repeating last row, which stays editable even after being served.
 */
export function isResponseLocked(
  index: number,
  total: number,
  served: boolean
): boolean {
  const isLast = index === total - 1;
  return served && !isLast;
}

/** Cannot delete a response that has already occurred — including the last row. */
export function canDeleteResponse(served: boolean): boolean {
  return !served;
}

// ---------------------------------------------------------------------------
// Singleton store
// ---------------------------------------------------------------------------

let state: AuthEngineState = {
  providerEnabled: false,
  responses: [createDefaultResponse()],
  servedIds: new Set<string>(),
  currentCallId: null,
  lastReturnedToken: null,
  logs: [],
  logsClearedBeforeId: null,
};

// Bumped on every (re-)register and on unregister so an in-flight call can
// detect it was superseded mid-delay (the "generation guard" / stale-call
// suppression contract in MAGE-794).
let generation = 0;
// Ever-incrementing call count since the last (re-)register; the read index
// clamps to the last response, giving the "repeat past the end" behavior.
let callCount = 0;

const listeners = new Set<() => void>();

function notify(): void {
  for (const listener of listeners) {
    listener();
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): AuthEngineState {
  return state;
}

// ---------------------------------------------------------------------------
// Auth logs (see AuthScreen for the UI note: these are wrapper JS bridge
// diagnostics, not the native SDK's own "Auth"-category logs)
// ---------------------------------------------------------------------------

const MAX_LOGS = 300;
let logSeq = 0;

function pushLog(level: AuthLogLevel, message: string): void {
  logSeq += 1;
  const entry: AuthLogEntry = {
    id: logSeq,
    level,
    message,
    timestampMs: Date.now(),
  };
  const nextLogs = [...state.logs, entry];
  state = {
    ...state,
    logs:
      nextLogs.length > MAX_LOGS
        ? nextLogs.slice(nextLogs.length - MAX_LOGS)
        : nextLogs,
  };
  notify();
}

function clearLogs(): void {
  const lastEntry = state.logs[state.logs.length - 1];
  state = { ...state, logsClearedBeforeId: lastEntry ? lastEntry.id : 0 };
  notify();
}

// Only surface console lines that are actually about the auth-token bridge —
// other sections (Push, Forms, ...) also log via console.warn/error, and
// mixing those into the Auth log viewer would be noise, not diagnostics.
const AUTH_BRIDGE_LOG_PATTERN = /auth token/i;

function captureIfAuthBridgeLog(
  level: 'warn' | 'error',
  args: unknown[]
): void {
  const message = args.map((arg) => String(arg)).join(' ');
  if (AUTH_BRIDGE_LOG_PATTERN.test(message)) {
    pushLog(level, message);
  }
}

let consoleInterceptionInstalled = false;
function ensureConsoleInterceptionInstalled(): void {
  if (consoleInterceptionInstalled) {
    return;
  }
  consoleInterceptionInstalled = true;

  const originalWarn = console.warn.bind(console);
  const originalError = console.error.bind(console);

  console.warn = (...args: unknown[]) => {
    originalWarn(...args);
    captureIfAuthBridgeLog('warn', args);
  };
  console.error = (...args: unknown[]) => {
    originalError(...args);
    captureIfAuthBridgeLog('error', args);
  };
}

ensureConsoleInterceptionInstalled();

// ---------------------------------------------------------------------------
// Scripted provider engine
// ---------------------------------------------------------------------------

function setResponses(next: ProviderResponse[]): void {
  state = { ...state, responses: next };
  notify();
}

function markServed(id: string): void {
  const nextServed = new Set(state.servedIds);
  nextServed.add(id);
  state = { ...state, servedIds: nextServed, currentCallId: id };
  notify();
}

function recordLastReturnedToken(token: string): void {
  state = { ...state, lastReturnedToken: token };
  notify();
}

function mintTokenForOutcome(outcome: MockTokenOutcome): string {
  if (outcome.mockKind === 'malformed') {
    return MALFORMED_MOCK_TOKEN;
  }
  const iat = Math.floor(Date.now() / 1000);
  const exp =
    outcome.expirationMode === 'duration'
      ? iat + outcome.durationSeconds
      : Math.floor(outcome.expEpochMs / 1000);
  return mintMockJwt({ iat, exp });
}

/**
 * Waits `ms` then resolves. Fires at the exact configured delay via `setTimeout`
 * (so sub-second 0.25s-step delays don't overshoot to the next tick), while a
 * lightweight 100ms poll still catches a mid-delay generation change
 * (reset/unregister) promptly rather than only after the full delay elapses.
 */
function cancellableDelay(ms: number, isStale: () => boolean): Promise<void> {
  return new Promise((resolve) => {
    if (ms <= 0 || isStale()) {
      resolve();
      return;
    }
    let settled = false;
    const finish = () => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timer);
      clearInterval(poll);
      resolve();
    };
    const timer = setTimeout(finish, ms);
    const poll = setInterval(() => {
      if (isStale()) {
        finish();
      }
    }, 100);
  });
}

/**
 * The provider function actually registered with the SDK. Defined once at
 * module scope: it always reads current engine state via the singleton
 * (never a stale closure), so re-registering doesn't require creating a new
 * function — only resetting the tracked state and bumping `generation`.
 */
const scriptedProvider: AuthTokenProvider = async () => {
  const myGeneration = generation;
  const responsesSnapshot = state.responses;
  const idx = Math.min(callCount, responsesSnapshot.length - 1);
  callCount += 1;

  const response = responsesSnapshot[idx];
  if (!response) {
    // Defensive: the engine always keeps at least one response.
    throw new Error('[ExampleApp/Auth] No scripted auth responses configured');
  }

  const isRepeatingLastRow = idx === responsesSnapshot.length - 1;
  markServed(response.id);
  pushLog(
    'debug',
    `Call received -> serving response #${idx + 1}${isRepeatingLastRow ? '+' : ''} (${getOutcomeLabel(response.outcome)}, delay ${response.delaySeconds}s)`
  );

  if (response.delaySeconds > 0) {
    await cancellableDelay(
      response.delaySeconds * 1000,
      () => generation !== myGeneration
    );
  }

  if (generation !== myGeneration) {
    pushLog(
      'debug',
      'Call discarded (stale generation) -- provider was reset or unregistered mid-flight'
    );
    throw new Error(
      '[ExampleApp/Auth] Auth token provider call cancelled (stale registration)'
    );
  }

  switch (response.outcome.kind) {
    case 'customToken': {
      recordLastReturnedToken(response.outcome.token);
      pushLog('debug', 'Resolved with custom token');
      return response.outcome.token;
    }
    case 'mockToken': {
      const token = mintTokenForOutcome(response.outcome);
      recordLastReturnedToken(token);
      pushLog(
        'debug',
        `Resolved with mock token (${response.outcome.mockKind})`
      );
      return token;
    }
    case 'networkError': {
      pushLog(
        'debug',
        'Rejecting with scripted network error (connectivity marker set)'
      );
      throw Object.assign(new Error('offline'), { isConnectivityError: true });
    }
    case 'otherError': {
      pushLog(
        'debug',
        'Rejecting with scripted other error (non-connectivity)'
      );
      throw new Error('Scripted "other" provider error');
    }
  }
};

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

function toggleProvider(enabled: boolean): void {
  generation += 1;
  callCount = 0;
  state = {
    ...state,
    providerEnabled: enabled,
    servedIds: new Set<string>(),
    currentCallId: null,
    lastReturnedToken: null,
  };
  notify();

  if (enabled) {
    pushLog(
      'debug',
      'Provider enabled -- calling Klaviyo.registerAuthTokenProvider (expect an eager fetch)'
    );
    Klaviyo.registerAuthTokenProvider(scriptedProvider);
  } else {
    pushLog(
      'debug',
      'Provider disabled -- calling Klaviyo.unregisterAuthTokenProvider'
    );
    Klaviyo.unregisterAuthTokenProvider();
  }
}

function addResponse(): void {
  setResponses([...state.responses, createDefaultResponse()]);
}

function duplicateResponse(id: string): void {
  const idx = state.responses.findIndex((r) => r.id === id);
  if (idx === -1) {
    return;
  }
  const original = state.responses[idx];
  if (!original) {
    return;
  }
  const copy: ProviderResponse = { ...original, id: generateResponseId() };
  const next = [...state.responses];
  next.splice(idx + 1, 0, copy);
  setResponses(next);
}

function deleteResponse(id: string): void {
  if (state.responses.length <= 1) {
    return; // always keep >= 1 response
  }
  const served = isServedEffective(id, state.providerEnabled, state.servedIds);
  if (!canDeleteResponse(served)) {
    return;
  }
  setResponses(state.responses.filter((r) => r.id !== id));
}

function updateResponse(id: string, next: ProviderResponse): void {
  setResponses(state.responses.map((r) => (r.id === id ? next : r)));
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useAuth() {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const visibleLogs = useMemo(() => {
    const cutoff = snapshot.logsClearedBeforeId;
    return cutoff === null
      ? snapshot.logs
      : snapshot.logs.filter((l) => l.id > cutoff);
  }, [snapshot.logs, snapshot.logsClearedBeforeId]);

  const isServed = useCallback(
    (id: string) =>
      isServedEffective(id, snapshot.providerEnabled, snapshot.servedIds),
    [snapshot.providerEnabled, snapshot.servedIds]
  );

  const getResponse = useCallback(
    (id: string) => snapshot.responses.find((r) => r.id === id),
    [snapshot.responses]
  );

  return {
    providerEnabled: snapshot.providerEnabled,
    responses: snapshot.responses,
    // "Before the first call (and whenever disabled), nothing is locked" —
    // and the Current-token section shows "--" while disabled.
    currentCallId: snapshot.providerEnabled ? snapshot.currentCallId : null,
    lastReturnedToken: snapshot.providerEnabled
      ? snapshot.lastReturnedToken
      : null,
    logs: visibleLogs,
    isServed,
    getResponse,
    toggleProvider,
    addResponse,
    duplicateResponse,
    deleteResponse,
    updateResponse,
    clearLogs,
  };
}
