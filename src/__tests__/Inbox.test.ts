import {
  InboxArchiveFilter,
  InboxError,
  InboxErrorCode,
  InboxReadFilter,
  MAX_INBOX_CLEAR_IDS,
  formatInboxPageOptions,
  parseInboxClearMessageResult,
  parseInboxClearMessagesResult,
  parseInboxMessage,
  parseInboxPage,
  parseInboxUnreadCount,
  parseInboxUpdateResult,
  toInboxError,
  validateInboxClearMessage,
  validateInboxClearMessages,
  validateInboxCursor,
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
      isRead: true,
      isArchived: false,
      source: 'server',
    });

    expect(message).toEqual({
      id: 'msg-2',
      defaultDestination: { type: 'open_app' },
      customData: {},
      actions: [],
      isRead: true,
      isArchived: false,
      source: 'server',
    });
    // The distinction matters: a consumer's Object.keys or deep-equality check sees the same
    // shape the native SDK emitted.
    expect(Object.keys(message!)).not.toContain('title');
    expect(message).not.toHaveProperty('sentAt');
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

  describe('local state timestamps', () => {
    // No native SDK exposes these on its public message type yet, so the fixtures below are ahead
    // of what the bridges send. Parsing them now means a native release that starts sending them
    // needs no JS change.
    const TIMESTAMP_FIELDS = [
      'readUpdatedAt',
      'archivedUpdatedAt',
      'updatedAt',
      'expiredAt',
    ] as const;

    it.each(TIMESTAMP_FIELDS)('carries %s through as epoch ms', (field) => {
      const message = parseInboxMessage(
        validBridgedMessage({ [field]: 1_700_000_002_000 })
      );

      expect(message).toHaveProperty(field, 1_700_000_002_000);
    });

    it('carries all four together', () => {
      const message = parseInboxMessage(
        validBridgedMessage({
          readUpdatedAt: 1,
          archivedUpdatedAt: 2,
          updatedAt: 3,
          expiredAt: 4,
        })
      );

      expect(message).toMatchObject({
        readUpdatedAt: 1,
        archivedUpdatedAt: 2,
        updatedAt: 3,
        expiredAt: 4,
      });
    });

    it.each(TIMESTAMP_FIELDS)('omits %s when absent', (field) => {
      const message = parseInboxMessage(validBridgedMessage());

      expect(message).not.toHaveProperty(field);
    });

    it.each(TIMESTAMP_FIELDS)('omits %s when null', (field) => {
      const message = parseInboxMessage(validBridgedMessage({ [field]: null }));

      expect(message).not.toHaveProperty(field);
    });

    it.each(TIMESTAMP_FIELDS)(
      'drops a malformed %s without failing the message',
      (field) => {
        // A future native field must never be able to make a message unusable, so these degrade
        // the same way the other optional fields do.
        const message = parseInboxMessage(
          validBridgedMessage({ [field]: 'yesterday' })
        );

        expect(message).not.toBeNull();
        expect(message?.id).toBe('msg-1');
        expect(message).not.toHaveProperty(field);
        expect(consoleWarnSpy).not.toHaveBeenCalled();
      }
    );

    it('does not accept a numeric string even when it looks like a timestamp', () => {
      const message = parseInboxMessage(
        validBridgedMessage({ readUpdatedAt: '1700000002000' })
      );

      expect(message).not.toHaveProperty('readUpdatedAt');
    });

    it('keeps timestamps independent of the other optional fields', () => {
      const message = parseInboxMessage(
        validBridgedMessage({ sentAt: undefined, readUpdatedAt: 99 })
      );

      expect(message).toHaveProperty('readUpdatedAt', 99);
      expect(message).not.toHaveProperty('sentAt');
    });
  });

  it('drops non-finite timestamps rather than propagating NaN', () => {
    const message = parseInboxMessage(
      validBridgedMessage({ sentAt: Number.NaN, receivedAt: Infinity })
    );

    expect(message).not.toHaveProperty('sentAt');
    expect(message).not.toHaveProperty('receivedAt');
  });

  it('accepts a null receivedAt as absent', () => {
    const message = parseInboxMessage(
      validBridgedMessage({ receivedAt: null })
    );

    expect(message).not.toHaveProperty('receivedAt');
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

describe('validateInboxCursor', () => {
  it('accepts an absent cursor', () => {
    expect(validateInboxCursor(undefined)).toBeNull();
  });

  it('accepts a non-empty cursor', () => {
    expect(validateInboxCursor('opaque-token')).toBeNull();
  });

  it.each([
    ['an empty string', ''],
    ['a blank string', '   '],
    ['a number', 42],
    ['null', null],
  ])('rejects %s', (_label, cursor) => {
    expect(validateInboxCursor(cursor)).toContain('cursor');
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

describe('formatInboxPageOptions', () => {
  it('returns undefined when there are no options, so native sees "first page"', () => {
    expect(formatInboxPageOptions(undefined)).toBeUndefined();
    expect(formatInboxPageOptions(null as never)).toBeUndefined();
  });

  it('drops absent fields', () => {
    expect(formatInboxPageOptions({})).toEqual({});
    expect(formatInboxPageOptions({ pageSize: 20 })).toEqual({ pageSize: 20 });
    expect(formatInboxPageOptions({ cursor: 'abc' })).toEqual({
      cursor: 'abc',
    });
  });

  it('truncates a fractional page size, which the bridge marshals as an int', () => {
    expect(formatInboxPageOptions({ pageSize: 20.9 })).toEqual({
      pageSize: 20,
    });
  });

  it('passes a cursor through untouched', () => {
    const cursor = 'token::with::separators';

    expect(formatInboxPageOptions({ cursor })).toEqual({ cursor });
  });

  it('forwards the filters', () => {
    expect(
      formatInboxPageOptions({
        readFilter: 'unread',
        archiveFilter: 'archived',
      })
    ).toEqual({ readFilter: 'unread', archiveFilter: 'archived' });
  });

  it('omits absent filters, so each platform default applies', () => {
    const bridged = formatInboxPageOptions({ pageSize: 10 });

    expect(bridged).toEqual({ pageSize: 10 });
    expect(bridged).not.toHaveProperty('readFilter');
    expect(bridged).not.toHaveProperty('archiveFilter');
  });

  it('forwards filters alongside a cursor', () => {
    expect(
      formatInboxPageOptions({
        cursor: 'abc',
        pageSize: 5,
        readFilter: 'read',
        archiveFilter: 'all',
      })
    ).toEqual({
      cursor: 'abc',
      pageSize: 5,
      readFilter: 'read',
      archiveFilter: 'all',
    });
  });
});

describe('validateInboxClearMessage', () => {
  it('accepts a non-empty message ID', () => {
    expect(validateInboxClearMessage('msg-1')).toBeNull();
  });

  it.each([
    ['an empty string', ''],
    ['a blank string', '   '],
    ['a number', 42],
    ['null', null],
    ['undefined', undefined],
  ])('rejects %s', (_label, messageId) => {
    expect(validateInboxClearMessage(messageId)).toContain('messageId');
  });
});

describe('validateInboxClearMessages', () => {
  it('returns the IDs ready to send', () => {
    expect(validateInboxClearMessages(['a', 'b'])).toEqual({ ids: ['a', 'b'] });
  });

  it('de-duplicates while preserving first-seen order', () => {
    // Passing the same ID twice must count once, and the decision belongs here rather than in both
    // native bridges.
    const result = validateInboxClearMessages(['b', 'a', 'b', 'c', 'a']);

    expect(result).toEqual({ ids: ['b', 'a', 'c'] });
  });

  it('accepts exactly the maximum number of IDs', () => {
    const ids = Array.from(
      { length: MAX_INBOX_CLEAR_IDS },
      (_, i) => `msg-${i}`
    );

    expect(validateInboxClearMessages(ids)).toEqual({ ids });
  });

  it('rejects more than the maximum number of unique IDs', () => {
    const ids = Array.from(
      { length: MAX_INBOX_CLEAR_IDS + 1 },
      (_, i) => `msg-${i}`
    );

    const result = validateInboxClearMessages(ids);

    expect(result).toHaveProperty('error');
    expect((result as { error: string }).error).toContain(
      String(MAX_INBOX_CLEAR_IDS)
    );
  });

  it('applies the maximum after de-duplication, not before', () => {
    // A caller repeating one ID many times never sends more than one ID, so it must not be
    // rejected for a count that could not have reached native.
    const ids = Array.from({ length: MAX_INBOX_CLEAR_IDS + 500 }, () => 'same');

    expect(validateInboxClearMessages(ids)).toEqual({ ids: ['same'] });
  });

  it.each([
    ['a string', 'msg-1'],
    ['a number', 1],
    ['null', null],
    ['undefined', undefined],
    ['an object', {}],
  ])('rejects %s', (_label, messageIds) => {
    const result = validateInboxClearMessages(messageIds);

    expect(result).toHaveProperty('error');
    expect((result as { error: string }).error).toContain('array');
  });

  it('rejects an empty array', () => {
    const result = validateInboxClearMessages([]);

    expect(result).toHaveProperty('error');
    expect((result as { error: string }).error).toContain('at least one');
  });

  it('names the index of a bad entry so the caller can fix it', () => {
    const result = validateInboxClearMessages(['ok', '']);

    expect(result).toHaveProperty('error');
    expect((result as { error: string }).error).toContain('messageIds[1]');
  });
});

describe('parseInboxClearMessageResult', () => {
  let consoleWarnSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
  });

  it('passes a boolean through', () => {
    expect(parseInboxClearMessageResult(true)).toBe(true);
    expect(parseInboxClearMessageResult(false)).toBe(false);
    expect(consoleWarnSpy).not.toHaveBeenCalled();
  });

  it.each([
    ['a string', 'true'],
    ['a number', 1],
    ['null', null],
  ])('reports false and warns for %s', (_label, raw) => {
    expect(parseInboxClearMessageResult(raw)).toBe(false);
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('clear result')
    );
  });
});

describe('parseInboxClearMessagesResult', () => {
  let consoleWarnSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
  });

  it('returns a non-negative count, zero included', () => {
    expect(parseInboxClearMessagesResult(0)).toBe(0);
    expect(parseInboxClearMessagesResult(3)).toBe(3);
  });

  it.each([
    ['a negative number', -1],
    ['NaN', Number.NaN],
    ['a string', '3'],
    ['null', null],
  ])('falls back to zero and warns for %s', (_label, raw) => {
    expect(parseInboxClearMessagesResult(raw)).toBe(0);
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('cleared count')
    );
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

describe('parseInboxUnreadCount', () => {
  let consoleWarnSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
  });

  it('returns a non-negative count', () => {
    expect(parseInboxUnreadCount(0)).toBe(0);
    expect(parseInboxUnreadCount(7)).toBe(7);
  });

  it('truncates a fractional count', () => {
    expect(parseInboxUnreadCount(3.9)).toBe(3);
  });

  it.each([
    ['a negative number', -1],
    ['NaN', Number.NaN],
    ['a string', '7'],
    ['null', null],
    ['undefined', undefined],
  ])('falls back to zero and warns for %s', (_label, raw) => {
    expect(parseInboxUnreadCount(raw)).toBe(0);
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('unread count')
    );
  });
});

describe('parseInboxUpdateResult', () => {
  let consoleWarnSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
  });

  it('passes a boolean through', () => {
    expect(parseInboxUpdateResult(true)).toBe(true);
    expect(parseInboxUpdateResult(false)).toBe(false);
    expect(consoleWarnSpy).not.toHaveBeenCalled();
  });

  it.each([
    ['a string', 'true'],
    ['a number', 1],
    ['null', null],
    ['undefined', undefined],
  ])('reports false and warns for %s', (_label, raw) => {
    // Anything but an explicit true: a host must not assume a message was updated when native did
    // not say so.
    expect(parseInboxUpdateResult(raw)).toBe(false);
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('update result')
    );
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
