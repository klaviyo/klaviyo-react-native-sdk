/**
 * Interface for the Klaviyo Forms API
 */
export interface KlaviyoFormsApi {
  /**
   * Load in-app forms data and display a form to the user if applicable based on the forms
   * configured in your Klaviyo account. Note [Klaviyo.initialize] must be called first
   * @param configuration Optional configuration for the form session. Defaults to 60 minutes timeout.
   */
  registerForInAppForms(configuration?: FormConfiguration): void;

  /**
   * Unregister from in-app forms
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
