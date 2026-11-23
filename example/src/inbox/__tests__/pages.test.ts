import {
  clampPageSize,
  EMPTY_PAGES,
  filtersEqual,
  flattenPages,
  MAX_PAGE_SIZE,
  MIN_PAGE_SIZE,
  pagesSummary,
  withFirstPage,
  withNextPage,
  withPages,
} from '../pages';
import type { InboxMessage, InboxPage } from 'klaviyo-react-native-sdk';

function message(id: string): InboxMessage {
  return {
    id,
    defaultDestination: { type: 'open_app' },
    customData: {},
    actions: [],
    isRead: false,
    isArchived: false,
    source: 'captured',
  };
}

function page(ids: string[], nextCursor?: string): InboxPage {
  return { messages: ids.map(message), nextCursor };
}

describe('clampPageSize', () => {
  it('keeps values inside the SDK range', () => {
    expect(clampPageSize(20)).toBe(20);
    expect(clampPageSize(0)).toBe(MIN_PAGE_SIZE);
    expect(clampPageSize(-5)).toBe(MIN_PAGE_SIZE);
    expect(clampPageSize(1000)).toBe(MAX_PAGE_SIZE);
  });

  it('rounds a fractional value', () => {
    expect(clampPageSize(7.6)).toBe(8);
  });
});

describe('withFirstPage / withNextPage', () => {
  it('replaces the pages on a refresh', () => {
    const initial = withNextPage(withFirstPage(page(['a'])), page(['b']));
    expect(flattenPages(initial).map((m) => m.id)).toEqual(['a', 'b']);

    const refreshed = withFirstPage(page(['c']));
    expect(flattenPages(refreshed).map((m) => m.id)).toEqual(['c']);
  });

  it('keeps each page separate so the screen can show page boundaries', () => {
    const state = withNextPage(withFirstPage(page(['a', 'b'])), page(['c']));
    expect(state.pages.map((p) => p.map((m) => m.id))).toEqual([
      ['a', 'b'],
      ['c'],
    ]);
  });

  it('tracks the next cursor and clears it on the last page', () => {
    expect(withFirstPage(page(['a'], 'cursor-2')).nextCursor).toBe('cursor-2');
    expect(withFirstPage(page(['a'])).nextCursor).toBeNull();
  });

  it('marks the state loaded even for an empty page', () => {
    const state = withFirstPage(page([]));
    expect(state.hasLoaded).toBe(true);
    expect(state.pages).toEqual([[]]);
  });

  it('ignores an empty next page rather than adding a blank page', () => {
    const state = withNextPage(withFirstPage(page(['a'])), page([]));
    expect(state.pages).toHaveLength(1);
  });

  it('starts empty and not loaded', () => {
    expect(EMPTY_PAGES.hasLoaded).toBe(false);
    expect(flattenPages(EMPTY_PAGES)).toEqual([]);
  });
});

describe('filtersEqual', () => {
  it('compares both filters', () => {
    expect(
      filtersEqual(
        { read: 'all', archive: 'active' },
        { read: 'all', archive: 'active' }
      )
    ).toBe(true);
    expect(
      filtersEqual(
        { read: 'all', archive: 'active' },
        { read: 'unread', archive: 'active' }
      )
    ).toBe(false);
    expect(
      filtersEqual(
        { read: 'all', archive: 'active' },
        { read: 'all', archive: 'all' }
      )
    ).toBe(false);
  });
});

describe('pagesSummary', () => {
  it('says when nothing has been fetched yet', () => {
    expect(pagesSummary(EMPTY_PAGES)).toBe('Not fetched yet');
  });

  it('counts messages and pages with correct pluralization', () => {
    expect(pagesSummary(withFirstPage(page(['a'])))).toBe(
      '1 message in 1 page'
    );
    expect(pagesSummary(withFirstPage(page(['a', 'b'])))).toBe(
      '2 messages in 1 page'
    );
  });
});

describe('withPages', () => {
  it('builds the same state as a first page followed by each next page', () => {
    const fetched = [page(['a'], 'c2'), page(['b'], 'c3'), page(['c'])];

    const state = withPages(fetched);

    expect(state).toEqual(
      withNextPage(
        withNextPage(withFirstPage(fetched[0]!), fetched[1]!),
        fetched[2]!
      )
    );
    expect(state.pages.map((messages) => messages.map((m) => m.id))).toEqual([
      ['a'],
      ['b'],
      ['c'],
    ]);
    expect(state.nextCursor).toBeNull();
  });

  it('keeps an empty first page but drops an empty later page', () => {
    expect(withPages([page([])]).hasLoaded).toBe(true);
    expect(withPages([page(['a'], 'c2'), page([])]).pages).toHaveLength(1);
  });

  it('is the empty state when nothing was fetched', () => {
    expect(withPages([])).toBe(EMPTY_PAGES);
  });
});
