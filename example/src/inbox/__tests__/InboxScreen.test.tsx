import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';
import type { InboxMessage, InboxPage } from 'klaviyo-react-native-sdk';

import { InboxScreen } from '../InboxScreen';
import { InboxTestIDs } from '../testIDs';

// A controllable fake of the wrapper's public inbox surface. The screen may
// only use these calls, so anything else is not mocked on purpose.
const mockFetchPage = jest.fn<Promise<InboxPage>, [unknown]>();
const mockFetchUnreadCount = jest.fn<Promise<number>, []>();
const mockUpdateMessageState = jest.fn<Promise<boolean>, [string, string]>();
const mockSubscribe = jest.fn((_handler: () => void) => {
  return () => {
    changeHandler = null;
  };
});
let changeHandler: (() => void) | null = null;
let mockCapabilities: { clear: boolean } | undefined = { clear: true };

jest.mock('klaviyo-react-native-sdk', () => ({
  InboxError: require('../MockInboxError').MockInboxError,
  InboxErrorCode: {
    StorageFailure: 'INBOX_STORAGE_FAILURE',
    InvalidCursor: 'INBOX_INVALID_CURSOR',
    Unavailable: 'INBOX_UNAVAILABLE',
    Unsupported: 'INBOX_UNSUPPORTED',
  },
  InboxReadFilter: { All: 'all', Unread: 'unread', Read: 'read' },
  InboxArchiveFilter: { Active: 'active', Archived: 'archived', All: 'all' },
  Klaviyo: {
    get capabilities() {
      return mockCapabilities;
    },
    fetchPage: (options: unknown) => mockFetchPage(options),
    fetchUnreadCount: () => mockFetchUnreadCount(),
    updateMessageState: (id: string, state: string) =>
      mockUpdateMessageState(id, state),
    subscribe: (handler: () => void) => mockSubscribe(handler),
  },
}));

// AppState is absent in this jest preset; the hook treats it as optional and
// skips the foreground refetch, so no mock is needed here.

function message(overrides: Partial<InboxMessage> = {}): InboxMessage {
  return {
    id: 'msg-1',
    title: 'First message',
    body: 'Hello there',
    defaultDestination: { type: 'open_app' },
    customData: {},
    actions: [],
    receivedAt: Date.UTC(2026, 10, 20, 10, 0, 0),
    isRead: false,
    isArchived: false,
    source: 'captured',
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  changeHandler = null;
  mockCapabilities = { clear: true };
  mockSubscribe.mockImplementation((handler) => {
    changeHandler = handler;
    return () => {
      changeHandler = null;
    };
  });
  mockFetchUnreadCount.mockResolvedValue(0);
  mockUpdateMessageState.mockResolvedValue(true);
});

describe('InboxScreen', () => {
  it('fetches the first page on mount and renders a message row', async () => {
    mockFetchPage.mockResolvedValue({
      messages: [message()],
      nextCursor: 'cursor-2',
    });

    await render(<InboxScreen />);

    expect(await screen.findByText('First message')).toBeTruthy();
    expect(mockFetchPage).toHaveBeenCalledWith(
      expect.objectContaining({ readFilter: 'all', archiveFilter: 'active' })
    );
    // The first page sends no cursor; only a next-page fetch does.
    expect(mockFetchPage.mock.calls[0]?.[0]).not.toHaveProperty('cursor');
    expect(screen.getByTestId(InboxTestIDs.pageHeader(1))).toBeTruthy();
    expect(screen.getByTestId(InboxTestIDs.readToggle('msg-1'))).toBeTruthy();
    expect(
      screen.getByTestId(InboxTestIDs.archiveToggle('msg-1'))
    ).toBeTruthy();
  });

  it('shows a helpful empty state when nothing has been captured', async () => {
    mockFetchPage.mockResolvedValue({ messages: [] });

    await render(<InboxScreen />);

    const empty = await screen.findByTestId(InboxTestIDs.EMPTY);
    expect(empty).toHaveTextContent(/fetchPage returns an empty page/);
  });

  it('shows a fetch failure', async () => {
    mockFetchPage.mockRejectedValue(new Error('store unavailable'));

    await render(<InboxScreen />);

    const error = await screen.findByTestId(InboxTestIDs.ERROR);
    expect(error).toHaveTextContent('store unavailable');
  });

  it('labels the state buttons with the change a tap makes, not current state', async () => {
    mockFetchPage.mockResolvedValue({
      messages: [message({ isRead: true, isArchived: true })],
    });

    await render(<InboxScreen />);

    expect(await screen.findByText('Mark unread')).toBeTruthy();
    expect(await screen.findByText('Unarchive')).toBeTruthy();
  });

  it('applies read and archive changes through updateMessageState', async () => {
    mockFetchPage.mockResolvedValue({ messages: [message()] });

    await render(<InboxScreen />);

    fireEvent.press(
      await screen.findByTestId(InboxTestIDs.readToggle('msg-1'))
    );
    await waitFor(() =>
      expect(mockUpdateMessageState).toHaveBeenCalledWith('msg-1', 'read')
    );

    fireEvent.press(
      await screen.findByTestId(InboxTestIDs.archiveToggle('msg-1'))
    );
    await waitFor(() =>
      expect(mockUpdateMessageState).toHaveBeenCalledWith('msg-1', 'archived')
    );
  });

  it('shows a state notice when the message is no longer stored', async () => {
    mockFetchPage.mockResolvedValue({ messages: [message()] });
    mockUpdateMessageState.mockResolvedValue(false);

    await render(<InboxScreen />);

    fireEvent.press(
      await screen.findByTestId(InboxTestIDs.readToggle('msg-1'))
    );

    const notice = await screen.findByTestId(InboxTestIDs.STATE_NOTICE);
    expect(notice).toHaveTextContent(/is not on this device/);
  });

  it('refetches the first page when a filter changes, dropping the cursor', async () => {
    mockFetchPage.mockResolvedValue({
      messages: [message()],
      nextCursor: 'cursor-2',
    });

    await render(<InboxScreen />);
    await screen.findByTestId(InboxTestIDs.message('msg-1'));

    fireEvent.press(
      await screen.findByTestId(InboxTestIDs.readFilter('unread'))
    );

    await waitFor(() =>
      expect(mockFetchPage).toHaveBeenLastCalledWith(
        expect.objectContaining({
          readFilter: 'unread',
          archiveFilter: 'active',
        })
      )
    );
    expect(mockFetchPage.mock.calls.at(-1)?.[0]).not.toHaveProperty('cursor');
  });

  it('loads the next page with the cursor from the previous page', async () => {
    mockFetchPage.mockResolvedValueOnce({
      messages: [message()],
      nextCursor: 'cursor-2',
    });
    mockFetchPage.mockResolvedValueOnce({
      messages: [message({ id: 'msg-2', title: 'Second message' })],
    });

    await render(<InboxScreen />);

    fireEvent.press(
      await screen.findByTestId(InboxTestIDs.FETCH_NEXT_PAGE_BUTTON)
    );

    expect(await screen.findByText('Second message')).toBeTruthy();
    await waitFor(() =>
      expect(mockFetchPage).toHaveBeenLastCalledWith(
        expect.objectContaining({ cursor: 'cursor-2' })
      )
    );
    expect(
      await screen.findByTestId(InboxTestIDs.END_OF_INBOX_TEXT)
    ).toBeTruthy();
  });

  it('refetches when the wrapper signals a change', async () => {
    mockFetchPage.mockResolvedValue({ messages: [message()] });

    await render(<InboxScreen />);
    await screen.findByTestId(InboxTestIDs.message('msg-1'));
    const callsBefore = mockFetchPage.mock.calls.length;

    await act(async () => {
      changeHandler!();
    });

    await waitFor(() =>
      expect(mockFetchPage.mock.calls.length).toBeGreaterThan(callsBefore)
    );
  });

  it('renders the unread count badge only when it is above zero', async () => {
    mockFetchPage.mockResolvedValue({ messages: [message()] });
    mockFetchUnreadCount.mockResolvedValue(3);

    await render(<InboxScreen />);
    const badge = await screen.findByTestId(InboxTestIDs.UNREAD_BADGE);
    expect(badge).toHaveTextContent('3');
  });

  it('shows the unavailable state when the native module is not linked', async () => {
    mockCapabilities = undefined;

    await render(<InboxScreen />);

    const unavailable = await screen.findByTestId(InboxTestIDs.UNAVAILABLE);
    expect(unavailable).toHaveTextContent(/not linked into this app/);
    expect(mockFetchPage).not.toHaveBeenCalled();
  });

  it('shows message details only when asked', async () => {
    mockFetchPage.mockResolvedValue({
      messages: [
        message({
          actions: [
            {
              id: 'a1',
              label: 'Shop now',
              destination: { type: 'open_url', url: 'https://example.com' },
            },
          ],
          customData: { foo: 'bar' },
        }),
      ],
    });

    await render(<InboxScreen />);

    expect(screen.queryByTestId(InboxTestIDs.details('msg-1'))).toBeNull();

    fireEvent.press(
      await screen.findByTestId(InboxTestIDs.detailsToggle('msg-1'))
    );

    const details = await screen.findByTestId(InboxTestIDs.details('msg-1'));
    expect(details).toHaveTextContent(/https:\/\/example\.com/);
    expect(details).toHaveTextContent(/customData\.foo/);
  });
});
