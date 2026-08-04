/**
 * Consent sub-types supported on the EMAIL channel.
 *
 * The string values are the wire format shared with the native SDKs. They are spelled out
 * explicitly rather than derived from the member name so the bridge contract stays stable if a
 * member is ever renamed.
 */
export const EmailConsent = {
  /** Email marketing consent. */
  Marketing: 'marketing',
  /** Email open-tracking consent. */
  OpenTracking: 'open_tracking',
} as const;

/** Union of valid {@link SubscriptionChannels#email} consent values. */
export type EmailConsent = (typeof EmailConsent)[keyof typeof EmailConsent];

/**
 * Consent sub-types supported on the SMS and WhatsApp channels.
 *
 * As with {@link EmailConsent}, the string values are the wire format shared with the native SDKs.
 */
export const MessagingConsent = {
  /** Marketing consent. */
  Marketing: 'marketing',
  /** Transactional messaging consent. */
  Transactional: 'transactional',
} as const;

/**
 * Union of valid {@link SubscriptionChannels#sms} and {@link SubscriptionChannels#whatsapp}
 * consent values.
 */
export type MessagingConsent =
  (typeof MessagingConsent)[keyof typeof MessagingConsent];

/**
 * The channels and consent sub-types to request in a {@link Subscription}.
 *
 * Mirrors the API's `subscriptions` object: each channel accepts only the consent sub-types the API
 * supports for it, so invalid combinations (transactional email, open-tracking SMS) don't typecheck.
 * Omitting a channel leaves it untouched.
 */
export interface SubscriptionChannels {
  /** Consent sub-types to request on the EMAIL channel. */
  readonly email?: readonly EmailConsent[];

  /** Consent sub-types to request on the SMS channel. */
  readonly sms?: readonly MessagingConsent[];

  /** Consent sub-types to request on the WhatsApp channel. */
  readonly whatsapp?: readonly MessagingConsent[];
}

/**
 * Requests MARKETING consent on every channel the profile has an identifier for
 * (email -> email marketing, phone -> SMS marketing).
 *
 * Assign this to {@link Subscription#channels}, or use {@link allAvailableMarketing} to build the
 * whole subscription. It is a named value rather than an omitted field because
 * {@link Subscription#channels} is deliberately required — a broad consent grant should never be
 * the result of a forgotten argument, matching the guarantee the native SDKs enforce with a private
 * constructor.
 */
export const ALL_AVAILABLE_MARKETING = 'allAvailableMarketing' as const;

/**
 * A request to subscribe the current profile to a Klaviyo list, with per-channel consent.
 *
 * Set the profile's email and/or phone number *before* subscribing — the native SDKs drop a request
 * whose channel has no matching identifier on the profile, and log a warning.
 */
export interface Subscription {
  /** ID of the Klaviyo list to subscribe the profile to. */
  readonly listId: string;

  /**
   * Channels and consent sub-types to request, or {@link ALL_AVAILABLE_MARKETING} to request
   * marketing consent on every identified channel.
   *
   * Required so a broad consent grant is always an explicit choice.
   */
  readonly channels: SubscriptionChannels | typeof ALL_AVAILABLE_MARKETING;

  /**
   * Free-text label describing where this signup originated (e.g. a form or screen name), stored as
   * the consent record's `$source`. Omitted from the request when absent.
   */
  readonly customSource?: string;
}

/**
 * Builds a {@link Subscription} requesting MARKETING consent on every channel the profile has an
 * identifier for. Mirrors the server's default behavior when no consent object is sent, but
 * requesting it is a deliberate call.
 *
 * @param listId ID of the Klaviyo list to subscribe the profile to
 * @param customSource Optional signup-source label, stored as the consent record's `$source`
 */
export function allAvailableMarketing(
  listId: string,
  customSource?: string
): Subscription {
  return { listId, channels: ALL_AVAILABLE_MARKETING, customSource };
}

/**
 * The payload shape sent across the bridge. `channels` is absent for the all-available-marketing
 * path, which is how the native bridges recognize the broad grant.
 */
type BridgedSubscription = {
  listId: string;
  customSource?: string;
  channels?: {
    email?: EmailConsent[];
    sms?: MessagingConsent[];
    whatsapp?: MessagingConsent[];
  };
};

/**
 * Converts a {@link Subscription} into its bridge payload, dropping absent optional fields so the
 * native side can distinguish "not requested" from "requested empty".
 *
 * An absent channel key stays absent (leave that channel untouched), while an empty array is passed
 * through so the native SDK's own validation reports it rather than this bridge silently dropping
 * the channel.
 *
 * @param subscription {@link Subscription} - the subscription to convert
 */
export function formatSubscription(
  subscription: Subscription
): BridgedSubscription {
  const bridged: BridgedSubscription = { listId: subscription.listId };

  if (subscription.customSource !== undefined) {
    bridged.customSource = subscription.customSource;
  }

  // ALL_AVAILABLE_MARKETING is signalled to native by omitting `channels` entirely.
  if (subscription.channels !== ALL_AVAILABLE_MARKETING) {
    const { email, sms, whatsapp } = subscription.channels;
    const channels: NonNullable<BridgedSubscription['channels']> = {};

    if (email !== undefined) channels.email = [...email];
    if (sms !== undefined) channels.sms = [...sms];
    if (whatsapp !== undefined) channels.whatsapp = [...whatsapp];

    bridged.channels = channels;
  }

  return bridged;
}

/**
 * Interface for Klaviyo list subscriptions.
 */
export interface KlaviyoSubscriptionApi {
  /**
   * Subscribes the current profile to a Klaviyo list and records its consent.
   *
   * Set the profile's email and/or phone number before calling this. Push subscriptions are not
   * created through this API — use `setPushToken` instead.
   *
   * @param subscription - The subscription to create
   */
  createSubscription(subscription: Subscription): void;
}
