/**
 * Represents the subscription channels configuration.
 */
export interface SubscriptionChannels {
  /**
   * Whether to subscribe to email marketing.
   */
  readonly email?: boolean;

  /**
   * Whether to subscribe to SMS marketing.
   */
  readonly sms?: boolean;
}

/**
 * Represents a subscription request to subscribe a profile to a Klaviyo list.
 */
export interface Subscription {
  /**
   * The ID of the Klaviyo list to subscribe the profile to.
   */
  readonly listId: string;

  /**
   * The subscription channels to request consent for.
   * If undefined, the API will default to MARKETING consent for all available channels
   * based on the profile identifiers (email for email channel, phone for SMS).
   */
  readonly channels?: SubscriptionChannels;
}

/**
 * Interface for the Klaviyo Subscription API
 */
export interface KlaviyoSubscriptionApi {
  /**
   * Creates a subscription and consent record for email and/or SMS channels.
   *
   * This method subscribes the currently tracked profile to the specified Klaviyo list.
   * The profile must have at least an email address or phone number set.
   *
   * If no specific channels are specified, the API will default to MARKETING consent
   * for all available channels based on the profile identifiers.
   *
   * @param subscription - The subscription containing the list ID and optional channel preferences
   */
  createSubscription(subscription: Subscription): void;
}
