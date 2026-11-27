import {
  InboxArchiveFilter,
  InboxError,
  InboxErrorCode,
  InboxReadFilter,
  parseInboxMessage,
  parseInboxPage,
  toInboxError,
  validateInboxPageOptions,
  validateInboxStateUpdate,
} from '../Inbox';

/** A complete, valid bridged message, as the native bridges emit one. */
function validBridgedMessage(
  overrides: Record<string, unknown> = {}
): Record<string, unknown> {
  return {
    id: 'msg-1',
    title: 'Your order shipped',
    body: 'Tracking is available',
    defaultDestination: { type: 'deep_link', url: 'myapp://orders/1' },
    mediaUrl: 'https://cdn.example.com/img.png',
    mediaType: 'image/png',
    customData: { orderId: '1', campaign: 'shipping' },
    actions: [
      {
        id: 'action-1',
        label: 'Track',
        destination: { type: 'open_url', url: 'https://example.com/track' },
      },
    ],
    sentAt: 1_700_000_000_000,
    receivedAt: 1_700_000_001_000,
    collapseId: 'collapse-1',
    badge: 3,
    isRead: false,
    isArchived: false,
    source: 'captured',
    ...overrides,
  };
}

describe('parseInboxMessage', () => {
  let consoleWarnSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
  });

  it('maps a complete bridged record to the public shape', () => {
    expect(parseInboxMessage(validBridgedMessage())).toEqual({
      id: 'msg-1',
      title: 'Your order shipped',
      body: 'Tracking is available',
      defaultDestination: { type: 'deep_link', url: 'myapp://orders/1' },
      mediaUrl: 'https://cdn.example.com/img.png',
      mediaType: 'image/png',
      customData: { orderId: '1', campaign: 'shipping' },
      actions: [
        {
          id: 'action-1',
          label: 'Track',
          destination: { type: 'open_url', url: 'https://example.com/track' },
        },
      ],
      sentAt: 1_700_000_000_000,
      receivedAt: 1_700_000_001_000,
      collapseId: 'collapse-1',
      badge: 3,
      isRead: false,
      isArchived: false,
      source: 'captured',
    });
    expect(consoleWarnSpy).not.toHaveBeenCalled();
  });

  it('preserves action order', () => {
    const message = parseInboxMessage(
      validBridgedMessage({
        actions: [
          { id: 'a', label: 'First', destination: { type: 'open_app' } },
          { id: 'b', label: 'Second', destination: { type: 'open_app' } },
          { id: 'c', label: 'Third', destination: { type: 'open_app' } },
        ],
      })
    );

    expect(message?.actions.map((action) => action.id)).toEqual([
      'a',
      'b',
      'c',
    ]);
  });

  it('omits absent optional fields rather than emitting undefined', () => {
    const message = parseInboxMessage({
      id: 'msg-2',
      defaultDestination: { type: 'open_app' },
      sentAt: 1_700_000_000_000,
      receivedAt: 1_700_000_001_000,
      isRead: true,
      isArchived: false,
      source: 'server',
    });

    expect(message).toEqual({
      id: 'msg-2',
      defaultDestination: { type: 'open_app' },
      customData: {},
      actions: [],
      sentAt: 1_700_000_000_000,
      receivedAt: 1_700_000_001_000,
      isRead: true,
      isArchived: false,
      source: 'server',
    });
    // The distinction matters: a consumer's Object.keys or deep-equality check sees the same
    // shape the native SDK emitted.
    expect(Object.keys(message!)).not.toContain('title');
  });

  it('drops an absent url from a destination instead of emitting an empty one', () => {
    const message = parseInboxMessage(
      validBridgedMessage({ defaultDestination: { type: 'open_app', url: '' } })
    );

    expect(message?.defaultDestination).toEqual({ type: 'open_app' });
  });

  it('preserves a null badge as null rather than dropping it', () => {
    const message = parseInboxMessage(validBridgedMessage({ badge: null }));

    expect(message?.badge).toBeNull();
    expect(message).toHaveProperty('badge');
  });

  it('drops a non-numeric badge', () => {
    const message = parseInboxMessage(validBridgedMessage({ badge: 'many' }));

    expect(message).not.toHaveProperty('badge');
  });

  it('drops a message whose timestamps are non-finite rather than propagating NaN', () => {
    expect(
      parseInboxMessage(
        validBridgedMessage({ sentAt: Number.NaN, receivedAt: Infinity })
      )
    ).toBeNull();
  });

  it('names both timestamps when both are missing', () => {
    parseInboxMessage(
      validBridgedMessage({ sentAt: undefined, receivedAt: undefined })
    );

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringMatching(/sentAt, receivedAt/)
    );
  });

  it('keeps an empty action label, which is a legitimate value', () => {
    const message = parseInboxMessage(
      validBridgedMessage({
        actions: [{ id: 'a', label: '', destination: { type: 'open_app' } }],
      })
    );

    expect(message?.actions[0]?.label).toBe('');
  });

  it('keeps destination types this SDK does not know, so a newer native SDK still works', () => {
    const message = parseInboxMessage(
      validBridgedMessage({ defaultDestination: { type: 'open_screen' } })
    );

    expect(message?.defaultDestination).toEqual({ type: 'open_screen' });
  });

  it('keeps sources this SDK does not know', () => {
    const message = parseInboxMessage(
      validBridgedMessage({ source: 'synced' })
    );

    expect(message?.source).toBe('synced');
  });

  describe('dropping malformed data', () => {
    it.each([
      ['id', { id: undefined }],
      ['id', { id: '' }],
      ['id', { id: 42 }],
      ['source', { source: '' }],
      ['isRead', { isRead: 'false' }],
      ['isArchived', { isArchived: undefined }],
      ['sentAt', { sentAt: undefined }],
      ['sentAt', { sentAt: null }],
      ['sentAt', { sentAt: '1700000000000' }],
      ['sentAt', { sentAt: Number.NaN }],
      ['receivedAt', { receivedAt: undefined }],
      ['receivedAt', { receivedAt: null }],
      ['receivedAt', { receivedAt: Infinity }],
      ['defaultDestination', { defaultDestination: undefined }],
      ['defaultDestination', { defaultDestination: { type: '' } }],
    ])('returns null when %s is invalid', (field, overrides) => {
      const result = parseInboxMessage(validBridgedMessage(overrides));

      expect(result).toBeNull();
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining(field)
      );
    });

    it('returns null for a non-object record', () => {
      expect(parseInboxMessage('nope')).toBeNull();
      expect(parseInboxMessage(null)).toBeNull();
      expect(parseInboxMessage([])).toBeNull();
    });
  });

  describe('degrading gracefully where the data is still usable', () => {
    it('falls back to empty custom data and warns', () => {
      const message = parseInboxMessage(
        validBridgedMessage({ customData: 'nope' })
      );

      expect(message?.customData).toEqual({});
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('custom data')
      );
    });

    it('drops non-string custom data values individually', () => {
      const message = parseInboxMessage(
        validBridgedMessage({ customData: { keep: 'yes', drop: 7 } })
      );

      expect(message?.customData).toEqual({ keep: 'yes' });
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('"drop"')
      );
    });

    it('drops malformed actions individually but keeps the rest', () => {
      const message = parseInboxMessage(
        validBridgedMessage({
          actions: [
            { id: 'a', label: 'Keep', destination: { type: 'open_app' } },
            { id: '', label: 'No id', destination: { type: 'open_app' } },
            { id: 'c', label: 'No destination' },
            'not-an-action',
            { id: 'e', label: 'Also keep', destination: { type: 'open_app' } },
          ],
        })
      );

      expect(message?.actions.map((action) => action.id)).toEqual(['a', 'e']);
      expect(consoleWarnSpy).toHaveBeenCalledTimes(3);
    });

    it('falls back to no actions when the array itself is malformed', () => {
      const message = parseInboxMessage(
        validBridgedMessage({ actions: 'nope' })
      );

      expect(message?.actions).toEqual([]);
    });
  });
});

describe('parseInboxPage', () => {
  let consoleWarnSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
  });

  it('parses messages and passes the cursor through verbatim', () => {
    // An opaque token: the JS layer must never parse it, so a nonsense value has to survive.
    const nextCursor = 'not-a-real-cursor::%%::still-opaque';

    const page = parseInboxPage({
      messages: [
        validBridgedMessage({ id: 'a' }),
        validBridgedMessage({ id: 'b' }),
      ],
      nextCursor,
    });

    expect(page.messages.map((message) => message.id)).toEqual(['a', 'b']);
    expect(page.nextCursor).toBe(nextCursor);
  });

  it('omits nextCursor on the last page', () => {
    const page = parseInboxPage({
      messages: [validBridgedMessage()],
      nextCursor: null,
    });

    expect(page).not.toHaveProperty('nextCursor');
  });

  it('omits an empty nextCursor', () => {
    const page = parseInboxPage({ messages: [], nextCursor: '' });

    expect(page).not.toHaveProperty('nextCursor');
  });

  it('keeps valid messages when a sibling is malformed', () => {
    const page = parseInboxPage({
      messages: [validBridgedMessage({ id: 'good' }), { id: '' }],
      nextCursor: 'cursor-2',
    });

    expect(page.messages.map((message) => message.id)).toEqual(['good']);
    // The cursor stays usable, so a consumer can keep paging past the bad record.
    expect(page.nextCursor).toBe('cursor-2');
  });

  it('skips a message that arrives without its timestamps and keeps paging', () => {
    const page = parseInboxPage({
      messages: [
        validBridgedMessage({ id: 'good' }),
        validBridgedMessage({ id: 'no-times', sentAt: null, receivedAt: null }),
      ],
      nextCursor: 'cursor-2',
    });

    expect(page.messages.map((message) => message.id)).toEqual(['good']);
    expect(page.nextCursor).toBe('cursor-2');
  });

  it('returns an empty page for a malformed payload', () => {
    expect(parseInboxPage(null)).toEqual({ messages: [] });
    expect(parseInboxPage('nope')).toEqual({ messages: [] });
  });

  it('returns an empty page when messages is not an array', () => {
    expect(parseInboxPage({ messages: 'nope' })).toEqual({ messages: [] });
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('no messages array')
    );
  });
});

describe('validateInboxPageOptions', () => {
  it('accepts absent options', () => {
    expect(validateInboxPageOptions(undefined)).toBeNull();
    expect(validateInboxPageOptions(null)).toBeNull();
  });

  it('accepts a page size and cursor', () => {
    expect(
      validateInboxPageOptions({ pageSize: 20, cursor: 'abc' })
    ).toBeNull();
  });

  it('does not reject an out-of-range page size, which native clamps', () => {
    expect(validateInboxPageOptions({ pageSize: 0 })).toBeNull();
    expect(validateInboxPageOptions({ pageSize: 5_000 })).toBeNull();
    expect(validateInboxPageOptions({ pageSize: 2.7 })).toBeNull();
  });

  it.each([
    ['a string', 'nope'],
    ['an array', []],
    ['a number', 5],
  ])('rejects options that is %s', (_label, options) => {
    expect(validateInboxPageOptions(options)).toContain('must be an object');
  });

  it.each([
    ['a string', '20'],
    ['NaN', Number.NaN],
    ['Infinity', Infinity],
  ])('rejects a page size that is %s', (_label, pageSize) => {
    expect(validateInboxPageOptions({ pageSize })).toContain('pageSize');
  });

  describe('filters', () => {
    it.each(['all', 'unread', 'read'])('accepts the %s read filter', (f) => {
      expect(validateInboxPageOptions({ readFilter: f })).toBeNull();
    });

    it.each(['active', 'archived', 'all'])(
      'accepts the %s archive filter',
      (f) => {
        expect(validateInboxPageOptions({ archiveFilter: f })).toBeNull();
      }
    );

    it('accepts both filters together with a cursor', () => {
      expect(
        validateInboxPageOptions({
          cursor: 'abc',
          readFilter: 'unread',
          archiveFilter: 'archived',
        })
      ).toBeNull();
    });

    it.each([
      ['an unknown read filter', { readFilter: 'deleted' }, 'readFilter'],
      ['a differently-cased read filter', { readFilter: 'ALL' }, 'readFilter'],
      ['a non-string read filter', { readFilter: 1 }, 'readFilter'],
      ['a null read filter', { readFilter: null }, 'readFilter'],
      [
        'an unknown archive filter',
        { archiveFilter: 'archivedOnly' },
        'archiveFilter',
      ],
      [
        'a differently-cased archive filter',
        { archiveFilter: 'Active' },
        'archiveFilter',
      ],
      ['a non-string archive filter', { archiveFilter: [] }, 'archiveFilter'],
    ])('rejects %s', (_label, options, field) => {
      // Rejected rather than defaulted: substituting a default would quietly return the wrong
      // messages.
      expect(validateInboxPageOptions(options)).toContain(field);
    });

    it('names the supported values so a caller can correct the call', () => {
      expect(validateInboxPageOptions({ readFilter: 'nope' })).toContain(
        'all, unread, read'
      );
      expect(validateInboxPageOptions({ archiveFilter: 'nope' })).toContain(
        'active, archived, all'
      );
    });
  });
});

describe('validateInboxStateUpdate', () => {
  it.each(['read', 'unread', 'archived', 'unarchived'])(
    'accepts the %s state',
    (state) => {
      expect(validateInboxStateUpdate('msg-1', state)).toBeNull();
    }
  );

  it.each([
    ['an empty message ID', '', 'read'],
    ['a blank message ID', '   ', 'read'],
    ['a non-string message ID', 42, 'read'],
  ])('rejects %s', (_label, messageId, state) => {
    expect(validateInboxStateUpdate(messageId, state)).toContain('messageId');
  });

  it.each([
    ['an unknown state', 'deleted'],
    ['a differently-cased state', 'READ'],
    ['a non-string state', 1],
  ])('rejects %s', (_label, state) => {
    expect(validateInboxStateUpdate('msg-1', state)).toContain('state');
  });
});

describe('filter constants', () => {
  it('exposes the wire values the native SDKs accept', () => {
    expect(Object.values(InboxReadFilter)).toEqual(['all', 'unread', 'read']);
    expect(Object.values(InboxArchiveFilter)).toEqual([
      'active',
      'archived',
      'all',
    ]);
  });

  it('matches a plain string literal, so consumers can compare directly', () => {
    const readFilter: string = InboxReadFilter.Unread;
    const archiveFilter: string = InboxArchiveFilter.Archived;

    expect(readFilter).toBe('unread');
    expect(archiveFilter).toBe('archived');
  });
});

describe('toInboxError', () => {
  let consoleWarnSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
  });

  it('passes an InboxError through unchanged', () => {
    const original = new InboxError(InboxErrorCode.InvalidCursor, 'bad cursor');

    expect(toInboxError(original)).toBe(original);
  });

  it('carries the native code across', () => {
    const nativeError = Object.assign(new Error('store unavailable'), {
      code: 'INBOX_STORAGE_FAILURE',
    });

    const error = toInboxError(nativeError);

    expect(error).toBeInstanceOf(InboxError);
    expect(error.code).toBe(InboxErrorCode.StorageFailure);
    expect(error.message).toBe('store unavailable');
    expect(consoleWarnSpy).not.toHaveBeenCalled();
  });

  it('preserves an unrecognized code and warns, since native may be newer', () => {
    const error = toInboxError(
      Object.assign(new Error('newer native'), { code: 'INBOX_QUOTA_EXCEEDED' })
    );

    expect(error.code).toBe('INBOX_QUOTA_EXCEEDED');
    // The type admits a code this SDK does not know, so a caller can compare against any string.
    const code: string = error.code;
    expect(code).toBe('INBOX_QUOTA_EXCEEDED');
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('INBOX_QUOTA_EXCEEDED')
    );
  });

  it('falls back to a storage failure when there is no code', () => {
    const error = toInboxError(new Error('bridge exploded'));

    expect(error.code).toBe(InboxErrorCode.StorageFailure);
    expect(error.message).toBe('bridge exploded');
  });

  it('handles a non-Error rejection', () => {
    const error = toInboxError('literal string');

    expect(error).toBeInstanceOf(InboxError);
    expect(error.code).toBe(InboxErrorCode.StorageFailure);
    expect(error.message).toBe('literal string');
  });

  it('produces an error instanceof InboxError despite Error subclassing', () => {
    const error = toInboxError(new Error('x'));

    expect(error).toBeInstanceOf(InboxError);
    expect(error).toBeInstanceOf(Error);
  });
});
