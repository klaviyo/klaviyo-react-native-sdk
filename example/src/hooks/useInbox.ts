import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import {
  Klaviyo,
  InboxError,
  InboxErrorCode,
  type InboxMessageState,
  type InboxPage,
  type InboxPageOptions,
} from 'klaviyo-react-native-sdk';

import {
  clampPageSize,
  DEFAULT_INBOX_FILTERS,
  DEFAULT_PAGE_SIZE,
  EMPTY_PAGES,
  filtersEqual,
  flattenPages,
  withFirstPage,
  withNextPage,
  type InboxFilters,
  type InboxPagesState,
} from '../inbox/pages';

/**
 * Whether the linked native build includes the Mobile Inbox module.
 *
 * The wrapper reports this through its capabilities getter. It is positive
 * only when the native bridge exports `INBOX_AVAILABLE`, so a build from before
 * the inbox existed reads as unavailable rather than failing every call.
 */
function inboxIsAvailable(): boolean {
  try {
    // The capabilities getter is cheap and does not cross the bridge.
    return Klaviyo.capabilities !== undefined;
  } catch {
    return false;
  }
}

/**
 * Start a promise whose result is handled inside it. The hook's fetchers record
 * their own errors, so a caller that does not await one still needs to say so
 * explicitly rather than leave a floating promise.
 */
function fireAndForget(promise: Promise<void>): void {
  promise.catch(() => {
    // Each fetcher records its own failure in state; nothing to add here.
  });
}

/** A human message for an inbox failure, matching the native test apps' wording. */
export function describeInboxError(error: unknown): string {
  if (error instanceof InboxError) {
    if (error.code === InboxErrorCode.Unavailable) {
      return 'The native Inbox module is not included in this build.';
    }
    return `${error.name}: ${error.message}`;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

export interface InboxState {
  available: boolean;
  pages: InboxPagesState;
  unreadCount: number;
  filters: InboxFilters;
  pageSize: number;
  isLoading: boolean;
  /** Why the latest fetch failed, or `null`. */
  errorMessage: string | null;
  /** Why the latest state change did not apply, or `null`. Kept separate from a fetch error. */
  stateNotice: string | null;
  changeSignalCount: number;
  lastChangeAt: number | null;
}

const INITIAL_STATE: InboxState = {
  available: true,
  pages: EMPTY_PAGES,
  unreadCount: 0,
  filters: DEFAULT_INBOX_FILTERS,
  pageSize: DEFAULT_PAGE_SIZE,
  isLoading: false,
  errorMessage: null,
  stateNotice: null,
  changeSignalCount: 0,
  lastChangeAt: null,
};

/**
 * Drives the Inbox screen from the wrapper's public inbox API only: `fetchPage`,
 * `fetchUnreadCount`, `updateMessageState`, `subscribe`, and `capabilities`.
 *
 * A fetch with no cursor replaces the pages (a refresh); a fetch with a cursor
 * appends. A change signal refetches the first page, because a cursor belongs
 * to the query that issued it and a change can move messages between pages.
 */
export function useInbox() {
  const [state, setState] = useState<InboxState>(INITIAL_STATE);

  // Guards against a stale fetch overwriting a newer one, the way the Android
  // test app's view model tracks request counts.
  const latestFirstPageRequest = useRef(0);
  const latestNextPageRequest = useRef(0);
  const filtersRef = useRef<InboxFilters>(DEFAULT_INBOX_FILTERS);
  const pageSizeRef = useRef<number>(DEFAULT_PAGE_SIZE);
  const nextCursorRef = useRef<string | null>(null);
  const isLoadingRef = useRef(false);

  filtersRef.current = state.filters;
  pageSizeRef.current = state.pageSize;
  nextCursorRef.current = state.pages.nextCursor;
  isLoadingRef.current = state.isLoading;

  const refreshUnreadCount = useCallback(async () => {
    try {
      const count = await Klaviyo.fetchUnreadCount();
      setState((prev) =>
        prev.unreadCount === count ? prev : { ...prev, unreadCount: count }
      );
    } catch (error) {
      setState((prev) => ({
        ...prev,
        errorMessage: describeInboxError(error),
      }));
    }
  }, []);

  const fetchFirstPage = useCallback(async () => {
    const request = ++latestFirstPageRequest.current;
    const options: InboxPageOptions = {
      pageSize: pageSizeRef.current,
      readFilter: filtersRef.current.read,
      archiveFilter: filtersRef.current.archive,
    };
    setState((prev) => ({
      ...prev,
      isLoading: true,
      errorMessage: null,
    }));
    try {
      const page: InboxPage = await Klaviyo.fetchPage(options);
      if (request !== latestFirstPageRequest.current) return;
      setState((prev) => ({
        ...prev,
        pages: withFirstPage(page),
        isLoading: false,
      }));
      // The unread count is independent of the page filters, so refresh it too.
      await refreshUnreadCount();
    } catch (error) {
      if (request !== latestFirstPageRequest.current) return;
      setState((prev) => ({
        ...prev,
        isLoading: false,
        errorMessage: describeInboxError(error),
      }));
    }
  }, [refreshUnreadCount]);

  const loadNextPage = useCallback(async () => {
    const cursor = nextCursorRef.current;
    if (cursor === null || isLoadingRef.current) return;
    const request = ++latestNextPageRequest.current;
    const options: InboxPageOptions = {
      pageSize: pageSizeRef.current,
      cursor,
      readFilter: filtersRef.current.read,
      archiveFilter: filtersRef.current.archive,
    };
    setState((prev) => ({ ...prev, isLoading: true, errorMessage: null }));
    try {
      const page = await Klaviyo.fetchPage(options);
      if (request !== latestNextPageRequest.current) return;
      setState((prev) => ({
        ...prev,
        pages: withNextPage(prev.pages, page),
        isLoading: false,
      }));
    } catch (error) {
      if (request !== latestNextPageRequest.current) return;
      setState((prev) => ({
        ...prev,
        isLoading: false,
        errorMessage: describeInboxError(error),
      }));
    }
  }, []);

  const refresh = useCallback(() => {
    return fetchFirstPage();
  }, [fetchFirstPage]);

  const setFilters = useCallback(
    (next: InboxFilters) => {
      if (filtersEqual(next, filtersRef.current)) return;
      filtersRef.current = next;
      setState((prev) => ({ ...prev, filters: next }));
      // The cursor was issued under the old filters, so start over.
      fireAndForget(fetchFirstPage());
    },
    [fetchFirstPage]
  );

  const setPageSize = useCallback((size: number) => {
    const clamped = clampPageSize(size);
    pageSizeRef.current = clamped;
    setState((prev) => ({ ...prev, pageSize: clamped }));
  }, []);

  const updateMessageState = useCallback(
    async (messageId: string, next: InboxMessageState) => {
      try {
        const exists = await Klaviyo.updateMessageState(messageId, next);
        setState((prev) => ({
          ...prev,
          stateNotice: exists
            ? null
            : `Message ${messageId} is not on this device, so its state was not changed. Retention may have removed it.`,
        }));
        // The change signal also fires for an applied change, but refectching
        // here keeps the row honest even if the signal is not delivered.
        await fetchFirstPage();
      } catch (error) {
        setState((prev) => ({
          ...prev,
          stateNotice: describeInboxError(error),
        }));
      }
    },
    [fetchFirstPage]
  );

  const clearStateNotice = useCallback(() => {
    setState((prev) =>
      prev.stateNotice === null ? prev : { ...prev, stateNotice: null }
    );
  }, []);

  // Initial fetch, on mount.
  useEffect(() => {
    const available = inboxIsAvailable();
    setState((prev) => ({ ...prev, available }));
    if (!available) return;
    fireAndForget(fetchFirstPage());
    // fetchFirstPage reads refs for the current filters and page size, so it is
    // stable across renders and safe to call once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Refetch when the app returns to the foreground, since pushes are captured
  // while it is in the background. Mirrors the native test apps. `AppState` is
  // missing in some headless jest environments, so treat it as optional.
  useEffect(() => {
    if (!state.available) return;
    if (AppState?.addEventListener === undefined) return;
    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'active') {
        fireAndForget(fetchFirstPage());
      }
    });
    return () => subscription.remove();
  }, [state.available, fetchFirstPage]);

  // Subscribe to the wrapper's change signal. Delivery is best effort and not
  // replayed, so this is an extra trigger on top of the foreground refetch.
  useEffect(() => {
    if (!state.available) return;
    const unsubscribe = Klaviyo.subscribe(() => {
      setState((prev) => ({
        ...prev,
        changeSignalCount: prev.changeSignalCount + 1,
        lastChangeAt: Date.now(),
      }));
      fireAndForget(fetchFirstPage());
    });
    return unsubscribe;
  }, [state.available, fetchFirstPage]);

  const messages = useMemo(() => flattenPages(state.pages), [state.pages]);

  return {
    ...state,
    messages,
    refresh,
    loadNextPage,
    setFilters,
    setPageSize,
    updateMessageState,
    clearStateNotice,
  };
}
