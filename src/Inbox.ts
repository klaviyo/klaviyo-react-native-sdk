import { isNonEmptyString } from './validation';

/**
 * The Mobile Inbox: the Klaviyo pushes this device has received, read from the native SDK's
 * on-device store.
 *
 * Capture and persistence stay entirely in the native SDKs. JavaScript cannot run while a push is
 * being delivered (iOS captures in the Notification Service Extension, Android in the Klaviyo FCM
 * service), so this bridge only queries and mutates the store the native SDK already wrote. Nothing
 * here receives a raw APNs/FCM payload or a platform persistence type — every value is already
 * normalized by the native SDK.
 */

/**
 * A local state a message can be put into.
 *
 * Read and archived are independent, so archiving a message leaves it read or unread. Putting a
 * message into the state it already has changes nothing, so every call is idempotent.
 */
export type InboxMessageState = 'read' | 'unread' | 'archived' | 'unarchived';

/** Every {@link InboxMessageState}, in the order the native SDKs declare them. */
const INBOX_MESSAGE_STATES: readonly InboxMessageState[] = [
  'read',
  'unread',
  'archived',
  'unarchived',
];

/**
 * Where tapping a message or one of its buttons leads. The host performs the navigation; the SDK
 * never opens a destination on its own.
 */
export interface InboxDestination {
  /**
   * What the tap does. Known values are `'open_app'`, `'deep_link'` and `'open_url'`.
   *
   * Typed as an open string rather than a closed union because both native SDKs model this as a raw
   * value on purpose: a later native release can add a destination type without breaking an
   * exhaustive `switch` in this SDK or in a host app.
   */
  readonly type: string;

  /**
   * The URL to route, for `'deep_link'` and `'open_url'`. Absent for `'open_app'`, which opens the
   * app with no further navigation.
   */
  readonly url?: string;
}

/** A button on a message. */
export interface InboxAction {
  /** Identifies the selected button for metrics. */
  readonly id: string;

  /** The button's visible label. May be an empty string when none is configured. */
  readonly label: string;

  /** What tapping the button does. */
  readonly destination: InboxDestination;
}

/**
 * A message in the inbox, as normalized by the native SDK.
 */
export interface InboxMessage {
  /** Opaque message ID, stable for the life of the message. */
  readonly id: string;

  /** The push title, when it had one. */
  readonly title?: string;

  /** The push body, when it had one. */
  readonly body?: string;

  /** What tapping the message does. */
  readonly defaultDestination: InboxDestination;

  /**
   * URL of the push's rich media. The host downloads and caches it; the SDK stores only the URL.
   */
  readonly mediaUrl?: string;

  /** Media type of {@link mediaUrl}, when the push declared one. */
  readonly mediaType?: string;

  /** Custom key/value data the push carried. */
  readonly customData: Record<string, string>;

  /** The message's buttons, in the order the push configured them. */
  readonly actions: readonly InboxAction[];

  /**
   * Server send time, in milliseconds since the Unix epoch. Always present: both native SDKs drop a
   * push that arrives without a valid send time rather than store it.
   */
  readonly sentAt: number;

  /**
   * When this device captured the push, in milliseconds since the Unix epoch. Always present: the
   * device stamps it when the push is stored.
   */
  readonly receivedAt: number;

  /** Collapse identifier of the push, when the platform exposes one. */
  readonly collapseId?: string;

  /**
   * The app-icon badge count the push requested, or `null` when it requested no badge change.
   *
   * iOS only: the Klaviyo `badge_value` when the push set one, otherwise `aps.badge`. Android has no
   * per-message badge, so it is always `null` there. This is *not* the inbox's unread count — use
   * {@link KlaviyoInboxApi.fetchUnreadCount} for that.
   */
  readonly badge?: number | null;

  /** Whether the message is locally marked read. */
  readonly isRead: boolean;

  /** Whether the message is locally archived. */
  readonly isArchived: boolean;

  /**
   * Where the message came from. Known values are `'captured'`, `'server'` and `'external'`.
   *
   * Typed as an open string for the same reason as {@link InboxDestination#type}.
   */
  readonly source: string;
}

/**
 * One page of inbox messages, newest first.
 */
export interface InboxPage {
  /** The messages on this page. Empty when nothing has been captured yet. */
  readonly messages: readonly InboxMessage[];

  /**
   * Opaque token for the next page. Pass it back to {@link KlaviyoInboxApi.fetchPage} unchanged —
   * it is not meant to be read, parsed, persisted across app versions, or constructed by hand.
   * Absent on the last page.
   */
  readonly nextCursor?: string;
}

/**
 * Which messages a page returns by read state.
 *
 * The values are the wire format shared with the native SDKs.
 */
export const InboxReadFilter = {
  /** Read and unread messages. */
  All: 'all',
  /** Unread messages only. */
  Unread: 'unread',
  /** Read messages only. */
  Read: 'read',
} as const;

/** Union of valid {@link InboxPageOptions#readFilter} values. */
export type InboxReadFilter =
  (typeof InboxReadFilter)[keyof typeof InboxReadFilter];

/**
 * Which messages a page returns by archived state.
 *
 * The values are the wire format shared with the native SDKs.
 */
export const InboxArchiveFilter = {
  /** Messages that are not archived. */
  Active: 'active',
  /** Archived messages only. */
  Archived: 'archived',
  /** Archived and not archived messages. */
  All: 'all',
} as const;

/** Union of valid {@link InboxPageOptions#archiveFilter} values. */
export type InboxArchiveFilter =
  (typeof InboxArchiveFilter)[keyof typeof InboxArchiveFilter];

/**
 * Which messages a bulk call such as {@link KlaviyoInboxApi.updateMessageStates} applies to, by read
 * state and archived state.
 *
 * Unlike {@link InboxPageOptions}, which leaves archived messages out unless it asks for them, a
 * filter has no default: a call that changes many messages always says which ones. Build one with
 * {@link InboxFilter.where}, or use {@link InboxFilter.allMessages} for every message.
 */
export interface InboxFilter {
  /** Whether read messages, unread messages, or both match. */
  readonly readFilter: InboxReadFilter;
  /** Whether archived messages, messages that are not archived, or both match. */
  readonly archiveFilter: InboxArchiveFilter;
}

export const InboxFilter = {
  /** Matches every message, read or unread, archived or not. */
  allMessages: {
    readFilter: InboxReadFilter.All,
    archiveFilter: InboxArchiveFilter.All,
  },

  /**
   * Matches the messages in the given read and archive states.
   *
   * @param read Whether read messages, unread messages, or both match
   * @param archive Whether archived messages, messages that are not archived, or both match
   */
  where(read: InboxReadFilter, archive: InboxArchiveFilter): InboxFilter {
    return { readFilter: read, archiveFilter: archive };
  },
} as const;

/**
 * Which page of the inbox to fetch.
 *
 * The filters narrow which messages the pages are made of, and they are independent: a read filter
 * of `'all'` with the default archive filter still leaves archived messages out.
 */
export interface InboxPageOptions {
  /**
   * Messages per page. The native SDKs clamp this to 1–100 and default it to 20, so a value outside
   * that range is corrected rather than rejected.
   */
  readonly pageSize?: number;

  /**
   * {@link InboxPage#nextCursor} from the previous page, or omitted for the first page. Opaque:
   * never parse it.
   *
   * A cursor is only valid with the same {@link readFilter} and {@link archiveFilter} it was issued
   * under. Passing it with different filters rejects with {@link InboxErrorCode.InvalidCursor}.
   */
  readonly cursor?: string;

  /**
   * Whether read messages, unread messages, or both are returned. Defaults to `'all'`.
   */
  readonly readFilter?: InboxReadFilter;

  /**
   * Whether archived messages, messages that are not archived, or both are returned. Defaults to
   * `'active'`, so archived messages are hidden unless a page explicitly asks for them.
   */
  readonly archiveFilter?: InboxArchiveFilter;
}

/**
 * Handler invoked when the inbox may have changed.
 *
 * This is a best-effort invalidation, not a durable delivery event: it carries no data and a
 * change that happens while the app or bridge is absent is never replayed. Query the inbox when
 * you subscribe, when the app launches, and when it returns to the foreground — an event only
 * tells you that a fetch you already make is worth repeating.
 */
export type InboxChangeHandler = () => void;

/**
 * Interface for the Klaviyo Mobile Inbox API.
 *
 * A native failure rejects with an {@link InboxError} carrying a stable {@link InboxErrorCode}, and
 * each rejection leaves the inbox unchanged. Malformed arguments — a `pageSize` that is not a
 * number, a `messageId` that is not a non-empty string, an unrecognized state — reject with a
 * `TypeError` instead, before anything crosses the bridge. The one exception is a blank cursor,
 * which is an {@link InboxErrorCode.InvalidCursor} because no page ever returned one.
 */
export interface KlaviyoInboxApi {
  /**
   * Fetch one page of the current company's messages, newest first.
   *
   * The page is empty when nothing has been captured yet, and before the SDK is initialized.
   * Pages run newest first by send time, or by the time this device received the push when the
   * send time is unknown.
   *
   * The filters choose which messages the page is made of. They default to every unarchived
   * message, read or unread — so archived messages are hidden unless
   * {@link InboxPageOptions#archiveFilter} asks for them.
   *
   * A cursor only continues the query it came from: pass it back with the same filters that
   * returned it, or the call rejects with {@link InboxErrorCode.InvalidCursor}.
   *
   * @param options Page size, cursor, and filters
   * @returns The page, with the cursor for the next one when there is more to read
   */
  fetchPage(options?: InboxPageOptions): Promise<InboxPage>;

  /**
   * Count the current company's messages that are unread and not archived.
   *
   * This is the inbox's own unread count. It is unrelated to the app-icon badge the OS shows; use
   * {@link InboxMessage#badge} for what a push asked the badge to become.
   *
   * @returns The unread, unarchived message count; zero when nothing has been captured yet
   */
  fetchUnreadCount(): Promise<number>;

  /**
   * Put a message into a local state. Read and archived are independent, applying a state the
   * message already has does nothing, and the call is idempotent.
   *
   * The state is local to this device: it is not synced to Klaviyo and is not reported as an
   * analytics event.
   *
   * @param messageId ID of the message to update
   * @param state The state to apply
   * @returns `true` when this device has a message with `messageId`, whether or not the change
   *   altered it; `false` when it does not, for example because retention removed it
   */
  updateMessageState(
    messageId: string,
    state: InboxMessageState
  ): Promise<boolean>;

  /**
   * Put every message that matches `filter` into a local state, for example to mark everything
   * read. The bulk form of {@link updateMessageState}, applied to the current company's messages
   * in one change, so {@link subscribe} handlers fire once.
   *
   * A message already in `state` is never matched, so it is not counted and not changed, and
   * repeating the call returns 0. That means a filter that allows only such messages changes
   * nothing: `'read'` with `{ readFilter: 'read' }`, `'unread'` with `{ readFilter: 'unread' }`,
   * `'archived'` with `{ archiveFilter: 'archived' }`, or `'unarchived'` with
   * `{ archiveFilter: 'active' }`. To unarchive, ask for archived messages.
   *
   * ```ts
   * // Archive everything.
   * await Klaviyo.updateMessageStates('archived', InboxFilter.allMessages);
   *
   * // Mark everything in the visible inbox as read.
   * await Klaviyo.updateMessageStates(
   *   'read',
   *   InboxFilter.where(InboxReadFilter.Unread, InboxArchiveFilter.Active)
   * );
   *
   * // Restore archived messages.
   * await Klaviyo.updateMessageStates(
   *   'unarchived',
   *   InboxFilter.where(InboxReadFilter.All, InboxArchiveFilter.Archived)
   * );
   * ```
   *
   * The state is local to this device, like {@link updateMessageState}.
   *
   * @param state The state to apply
   * @param filter Which messages to apply it to. Required: there is no default.
   * @returns How many messages changed. 0 when none did, when the filter cannot match (see above),
   *   and before the SDK is initialized
   */
  updateMessageStates(
    state: InboxMessageState,
    filter: InboxFilter
  ): Promise<number>;

  /**
   * Remove every message this device has for the current company.
   *
   * This is a local delete, not a server-side unsubscribe or a suppression: the messages are gone
   * from this device's store only. Messages for other companies on the device are left alone.
   * It does not replace the clear on a profile reset: calling `resetProfile()` already clears the
   * inbox in full, for every company, natively, so one profile's messages are never shown to the
   * next.
   *
   * {@link subscribe} handlers fire once, and not at all when there was nothing to remove.
   *
   * @returns How many messages were removed. 0 when there were none, and before the SDK is
   *   initialized
   */
  clearAll(): Promise<number>;

  /**
   * Subscribe to inbox change invalidations.
   *
   * The handler fires when the inbox may have changed: a push was captured, a message's state was
   * updated, or messages were cleared. It carries no data — fetch the page you are showing again.
   *
   * Delivery is best effort. A change that happens while the app is suspended is not replayed, so
   * also fetch on app launch and on every return to the foreground. Handlers are not called
   * after the returned function runs.
   *
   * Registering the same function more than once has no additional effect — it is called once per
   * change — and any one unsubscribe removes it.
   *
   * @param handler Called when the inbox may have changed
   * @returns A function that removes the handler
   */
  subscribe(handler: InboxChangeHandler): () => void;
}

/**
 * Name of the native-to-JS event emitted over `NativeEventEmitter` when the inbox may have changed.
 * The event carries no payload.
 */
export const INBOX_CHANGED_EVENT = 'klaviyo:inboxChanged';

/**
 * Stable error codes carried by an {@link InboxError}.
 *
 * These values are part of the public contract: compare against them rather than matching on
 * message text, which is free to change.
 */
export const InboxErrorCode = {
  /** The on-device store could not complete the call. */
  StorageFailure: 'INBOX_STORAGE_FAILURE',
  /**
   * The cursor is malformed, did not come from a page of this inbox, or was issued under different
   * filters than the ones it is being reused with.
   */
  InvalidCursor: 'INBOX_INVALID_CURSOR',
  /** The native Inbox module is not linked into this build, or is not compatible with this SDK. */
  Unavailable: 'INBOX_UNAVAILABLE',
} as const;

/** Union of valid {@link InboxError} codes. */
export type InboxErrorCode =
  (typeof InboxErrorCode)[keyof typeof InboxErrorCode];

const KNOWN_INBOX_ERROR_CODES: readonly string[] =
  Object.values(InboxErrorCode);

/**
 * A failed inbox call.
 *
 * `code` is one of {@link InboxErrorCode}. The message is diagnostic only and is not part of the
 * contract.
 */
export class InboxError extends Error {
  /** Stable failure code. Compare against {@link InboxErrorCode}, never against `message`. */
  readonly code: InboxErrorCode;

  constructor(code: InboxErrorCode, message: string) {
    super(message);
    this.name = 'InboxError';
    this.code = code;
    // Subclassing Error loses the prototype chain under the ES5 output some Babel configurations
    // emit, which breaks `instanceof`. Restoring it keeps `error instanceof InboxError` reliable.
    Object.setPrototypeOf(this, InboxError.prototype);
  }
}

/**
 * Normalizes a rejection from the native bridge into an {@link InboxError}.
 *
 * Native rejections arrive as a plain `Error` carrying the stable `code` alongside a message. An
 * unrecognized code is preserved rather than rewritten — it means the native module is newer than
 * this SDK — but it is warned about, since consumers can only switch on the known ones.
 *
 * @param error Whatever the bridge or native module rejected with
 */
export function toInboxError(error: unknown): InboxError {
  if (error instanceof InboxError) {
    return error;
  }

  const message = error instanceof Error ? error.message : String(error);
  const rawCode = (error as { code?: unknown } | null | undefined)?.code;

  if (typeof rawCode === 'string' && rawCode.length > 0) {
    if (!KNOWN_INBOX_ERROR_CODES.includes(rawCode)) {
      console.warn(
        `[Klaviyo] Unrecognized inbox error code: ${rawCode}. This SDK may be older than the native module.`
      );
    }
    return new InboxError(rawCode as InboxErrorCode, message);
  }

  // A rejection with no code at all came from the bridge rather than the native SDK's own error
  // mapping, so it is reported as a failed call.
  return new InboxError(InboxErrorCode.StorageFailure, message);
}

const INBOX_READ_FILTERS: readonly string[] = Object.values(InboxReadFilter);
const INBOX_ARCHIVE_FILTERS: readonly string[] =
  Object.values(InboxArchiveFilter);

/**
 * Validates the shape of {@link InboxPageOptions} at runtime, returning an error message or `null`
 * when valid.
 *
 * TypeScript cannot police plain-JavaScript callers, and this data crosses the native bridge, so
 * argument types are checked here. An out-of-range `pageSize` is deliberately *not* an error: the
 * native SDKs clamp it to 1–100, so this layer only rejects values the bridge cannot marshal.
 *
 * The cursor is checked in `fetchPage` instead, because a bad cursor is a
 * different failure — it surfaces as {@link InboxErrorCode.InvalidCursor} rather than a caller
 * type error.
 *
 * @param options The options to validate
 */
export function validateInboxPageOptions(options: unknown): string | null {
  if (options === undefined || options === null) {
    return null;
  }

  if (typeof options !== 'object' || Array.isArray(options)) {
    return 'Inbox page options must be an object when provided';
  }

  const { pageSize, readFilter, archiveFilter } = options as InboxPageOptions;

  if (
    pageSize !== undefined &&
    (typeof pageSize !== 'number' || !Number.isFinite(pageSize))
  ) {
    return 'Inbox pageSize must be a finite number when provided';
  }

  // Filters are rejected rather than coerced: silently substituting the default would return the
  // wrong messages while looking like it worked.
  if (
    readFilter !== undefined &&
    (typeof readFilter !== 'string' || !INBOX_READ_FILTERS.includes(readFilter))
  ) {
    return `Inbox readFilter must be one of: ${INBOX_READ_FILTERS.join(', ')}`;
  }

  if (
    archiveFilter !== undefined &&
    (typeof archiveFilter !== 'string' ||
      !INBOX_ARCHIVE_FILTERS.includes(archiveFilter))
  ) {
    return `Inbox archiveFilter must be one of: ${INBOX_ARCHIVE_FILTERS.join(
      ', '
    )}`;
  }

  return null;
}

/**
 * Validates an {@link KlaviyoInboxApi.updateMessageState} call at runtime, returning an error
 * message or `null` when valid.
 *
 * @param messageId ID of the message to update
 * @param state The state to apply
 */
export function validateInboxStateUpdate(
  messageId: unknown,
  state: unknown
): string | null {
  if (!isNonEmptyString(messageId)) {
    return 'Inbox messageId is required and must be a non-empty string';
  }

  if (
    typeof state !== 'string' ||
    !(INBOX_MESSAGE_STATES as readonly string[]).includes(state)
  ) {
    return `Inbox state must be one of: ${INBOX_MESSAGE_STATES.join(', ')}`;
  }

  return null;
}

/**
 * Validates an {@link KlaviyoInboxApi.updateMessageStates} call at runtime, returning an error
 * message or `null` when valid.
 *
 * Both filter fields are required. A bulk change with a missing filter would have to guess which
 * messages the caller meant, and the wrong guess changes or hides data, so it is rejected instead.
 *
 * @param state The state to apply
 * @param filter Which messages to apply it to
 */
export function validateInboxFilterUpdate(
  state: unknown,
  filter: unknown
): string | null {
  if (
    typeof state !== 'string' ||
    !(INBOX_MESSAGE_STATES as readonly string[]).includes(state)
  ) {
    return `Inbox state must be one of: ${INBOX_MESSAGE_STATES.join(', ')}`;
  }

  if (typeof filter !== 'object' || filter === null) {
    return 'Inbox filter is required: use InboxFilter.allMessages or InboxFilter.where(read, archive)';
  }

  const { readFilter, archiveFilter } = filter as Record<string, unknown>;
  if (
    typeof readFilter !== 'string' ||
    !INBOX_READ_FILTERS.includes(readFilter)
  ) {
    return `Inbox filter readFilter must be one of: ${INBOX_READ_FILTERS.join(', ')}`;
  }
  if (
    typeof archiveFilter !== 'string' ||
    !INBOX_ARCHIVE_FILTERS.includes(archiveFilter)
  ) {
    return `Inbox filter archiveFilter must be one of: ${INBOX_ARCHIVE_FILTERS.join(', ')}`;
  }

  return null;
}

/** Returns a string only when the value is one, so absent and non-string values stay absent. */
function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

/**
 * Returns a finite number only when the value is one. Rejects numeric strings, `NaN` and
 * infinities, none of which a bridge can produce for a legitimate timestamp or badge.
 */
function optionalNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value)
    ? value
    : undefined;
}

/**
 * Parses one bridged destination, returning `null` when it has no usable type.
 */
function parseInboxDestination(raw: unknown): InboxDestination | null {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return null;
  }

  const { type, url } = raw as Record<string, unknown>;
  if (!isNonEmptyString(type)) {
    return null;
  }

  return isNonEmptyString(url) ? { type, url } : { type };
}

/**
 * Parses one bridged button, returning `null` when it is not a complete action.
 *
 * A button can legitimately have an empty label, so any string is accepted there.
 */
function parseInboxAction(raw: unknown): InboxAction | null {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return null;
  }

  const { id, label, destination } = raw as Record<string, unknown>;
  const parsedDestination = parseInboxDestination(destination);

  if (!isNonEmptyString(id) || typeof label !== 'string') {
    return null;
  }
  if (parsedDestination === null) {
    return null;
  }

  return { id, label, destination: parsedDestination };
}

/**
 * Parses the bridged buttons for one message, preserving the order the push configured them in.
 *
 * A malformed button is dropped and reported rather than failing the whole message: the remaining
 * buttons are still usable, and losing a message is worse than losing one of its buttons.
 */
function parseInboxActions(raw: unknown, messageId: string): InboxAction[] {
  if (raw === undefined || raw === null) {
    return [];
  }

  if (!Array.isArray(raw)) {
    console.warn(
      `[Klaviyo] Ignoring actions on inbox message ${messageId}: not an array`
    );
    return [];
  }

  const actions: InboxAction[] = [];
  raw.forEach((entry, index) => {
    const action = parseInboxAction(entry);
    if (action === null) {
      console.warn(
        `[Klaviyo] Ignoring invalid action at index ${index} on inbox message ${messageId}`
      );
      return;
    }
    actions.push(action);
  });

  return actions;
}

/**
 * Parses the bridged custom data for one message.
 *
 * Custom data is metadata rather than payload, so a missing or malformed value falls back to an
 * empty object instead of dropping the message. Individual non-string values are dropped and
 * reported, since the contract is `Record<string, string>`.
 */
function parseInboxCustomData(
  raw: unknown,
  messageId: string
): Record<string, string> {
  if (raw === undefined || raw === null) {
    return {};
  }

  if (typeof raw !== 'object' || Array.isArray(raw)) {
    console.warn(
      `[Klaviyo] Ignoring custom data on inbox message ${messageId}: not an object`
    );
    return {};
  }

  const customData: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof value === 'string') {
      customData[key] = value;
    } else {
      console.warn(
        `[Klaviyo] Ignoring non-string custom data value for key "${key}" on inbox message ${messageId}`
      );
    }
  }

  return customData;
}

/**
 * Parses a raw bridged record into a validated {@link InboxMessage}.
 *
 * Returns `null` and logs a warning when a required field is missing or of the wrong type:
 * `id`, `defaultDestination` (with a usable `type`), `source`, `isRead` and `isArchived`. Those are
 * the fields a host cannot sensibly substitute a default for; everything optional is omitted from
 * the result when absent, so an absent field and an empty one stay distinguishable.
 *
 * @param raw Raw message data from the native bridge
 * @returns A validated InboxMessage, or null when the record is unusable
 */
export function parseInboxMessage(raw: unknown): InboxMessage | null {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    console.warn('[Klaviyo] Ignoring inbox message that is not an object');
    return null;
  }

  const data = raw as Record<string, unknown>;
  const missingFields: string[] = [];

  if (!isNonEmptyString(data.id)) missingFields.push('id');
  if (!isNonEmptyString(data.source)) missingFields.push('source');
  if (typeof data.isRead !== 'boolean') missingFields.push('isRead');
  if (typeof data.isArchived !== 'boolean') missingFields.push('isArchived');
  if (optionalNumber(data.sentAt) === undefined) missingFields.push('sentAt');
  if (optionalNumber(data.receivedAt) === undefined) {
    missingFields.push('receivedAt');
  }

  const defaultDestination = parseInboxDestination(data.defaultDestination);
  if (defaultDestination === null) missingFields.push('defaultDestination');

  if (missingFields.length > 0) {
    console.warn(
      `[Klaviyo] Ignoring inbox message with missing or invalid field(s): ${missingFields.join(
        ', '
      )}`
    );
    return null;
  }

  const id = data.id as string;
  const title = optionalString(data.title);
  const body = optionalString(data.body);
  const mediaUrl = optionalString(data.mediaUrl);
  const mediaType = optionalString(data.mediaType);
  const collapseId = optionalString(data.collapseId);
  // `null` is meaningful here — it means "the push asked for no badge change" — so it is preserved
  // rather than collapsed into "absent".
  const badge = data.badge === null ? null : optionalNumber(data.badge);

  return {
    id,
    defaultDestination: defaultDestination as InboxDestination,
    customData: parseInboxCustomData(data.customData, id),
    actions: parseInboxActions(data.actions, id),
    sentAt: data.sentAt as number,
    receivedAt: data.receivedAt as number,
    isRead: data.isRead as boolean,
    isArchived: data.isArchived as boolean,
    source: data.source as string,
    // Conditional spreads keep absent fields absent rather than present-but-undefined, so a
    // consumer's `Object.keys` or deep-equality check sees the same shape the native SDK emitted.
    ...(title !== undefined && { title }),
    ...(body !== undefined && { body }),
    ...(mediaUrl !== undefined && { mediaUrl }),
    ...(mediaType !== undefined && { mediaType }),
    ...(collapseId !== undefined && { collapseId }),
    ...(badge !== undefined && { badge }),
  };
}

/**
 * Parses a raw bridged page into a validated {@link InboxPage}.
 *
 * Individual malformed messages are dropped and reported rather than failing the page: the cursor
 * is still valid for the rest of the inbox, so a consumer can keep paging. The cursor is passed
 * through verbatim — it is opaque and this layer never inspects it.
 *
 * @param raw Raw page data from the native bridge
 * @returns A validated InboxPage; empty when the payload is unusable
 */
export function parseInboxPage(raw: unknown): InboxPage {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    console.warn('[Klaviyo] Ignoring inbox page that is not an object');
    return { messages: [] };
  }

  const data = raw as Record<string, unknown>;
  const rawMessages = Array.isArray(data.messages) ? data.messages : [];

  if (!Array.isArray(data.messages)) {
    console.warn('[Klaviyo] Inbox page has no messages array');
  }

  const messages: InboxMessage[] = [];
  for (const entry of rawMessages) {
    const message = parseInboxMessage(entry);
    if (message !== null) {
      messages.push(message);
    }
  }

  return {
    messages,
    ...(isNonEmptyString(data.nextCursor) && { nextCursor: data.nextCursor }),
  };
}
