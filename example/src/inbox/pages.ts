import type {
  InboxArchiveFilter,
  InboxMessage,
  InboxPage,
  InboxReadFilter,
} from 'klaviyo-react-native-sdk';

/** The read-state filter the pages are made of. */
export interface InboxFilters {
  read: InboxReadFilter;
  archive: InboxArchiveFilter;
}

/**
 * The SDK defaults: every unarchived message, read or unread. Archived
 * messages are hidden until the Archive filter asks for them.
 */
export const DEFAULT_INBOX_FILTERS: InboxFilters = {
  read: 'all',
  archive: 'active',
};

/** The SDK clamps a page size to 1–100 and defaults it to 20. */
export const MIN_PAGE_SIZE = 1;
export const MAX_PAGE_SIZE = 100;
export const DEFAULT_PAGE_SIZE = 20;

export function clampPageSize(size: number): number {
  return Math.min(Math.max(Math.round(size), MIN_PAGE_SIZE), MAX_PAGE_SIZE);
}

/**
 * One `fetchPage` call's messages. Pages are kept in the order fetched so the
 * screen can show where each one ends, the way the native test apps do.
 */
export interface InboxPagesState {
  /** One entry per page, in fetch order. */
  pages: readonly (readonly InboxMessage[])[];
  /** Cursor for the next page, or `null` on the last page. */
  nextCursor: string | null;
  /** True once the first fetch has returned, so an empty list can be told from "not fetched". */
  hasLoaded: boolean;
}

export const EMPTY_PAGES: InboxPagesState = {
  pages: [],
  nextCursor: null,
  hasLoaded: false,
};

/** Every loaded message, in fetch order. */
export function flattenPages(pages: InboxPagesState): InboxMessage[] {
  return pages.pages.flatMap((page) => page);
}

/**
 * Apply a first-page fetch: a refresh replaces the pages rather than appending.
 * Cursors are only valid for the filters that issued them, so a refresh after a
 * filter change always starts from `null`.
 */
export function withFirstPage(page: InboxPage): InboxPagesState {
  return {
    pages: [page.messages],
    nextCursor: page.nextCursor ?? null,
    hasLoaded: true,
  };
}

/** Append a next-page fetch. */
export function withNextPage(
  state: InboxPagesState,
  page: InboxPage
): InboxPagesState {
  return {
    pages:
      page.messages.length > 0 ? [...state.pages, page.messages] : state.pages,
    nextCursor: page.nextCursor ?? null,
    hasLoaded: true,
  };
}

/**
 * Build the state from consecutive pages fetched in one pass (the first page,
 * then each page its cursor led to). The first page is always kept, even when
 * empty, so an empty inbox reads as loaded; later empty pages are dropped.
 */
export function withPages(fetched: readonly InboxPage[]): InboxPagesState {
  const [first, ...rest] = fetched;
  if (first === undefined) return EMPTY_PAGES;
  return rest.reduce(withNextPage, withFirstPage(first));
}

/**
 * Whether the two filter sets would produce the same query. Used to decide
 * whether a filter change needs a refetch (and a cursor reset).
 */
export function filtersEqual(a: InboxFilters, b: InboxFilters): boolean {
  return a.read === b.read && a.archive === b.archive;
}

/** A short human summary of the loaded pages, for the diagnostics line. */
export function pagesSummary(pages: InboxPagesState): string {
  if (!pages.hasLoaded) return 'Not fetched yet';
  const count = flattenPages(pages).length;
  const pageCount = pages.pages.length;
  return `${count} ${count === 1 ? 'message' : 'messages'} in ${pageCount} ${
    pageCount === 1 ? 'page' : 'pages'
  }`;
}
