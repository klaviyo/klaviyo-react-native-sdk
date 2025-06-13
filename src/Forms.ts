/**
 * Interface for the Klaviyo Forms API
 */
export interface KlaviyoFormsApi {
  /**
   * Load in-app forms data and display a form to the user if applicable based on the forms
   * configured in your Klaviyo account. Note [Klaviyo.initialize] must be called first
   * @param configuration Duration (in seconds) of the period of user inactivity after which
   * the user's app session is terminated and the forms session is ended. Defaults to 1 Hour.
   */
  registerForInAppForms(configuration?: FormConfiguration): void;

  /**
   * Unregisters app from receiving in-app forms.
   */
  unregisterFromInAppForms(): void;
}

/**
 * Interface for an event
 */
export interface FormConfiguration {
  /**
   * Duration in seconds before the session times out
   */
  readonly sessionTimeoutDuration: number;
}
