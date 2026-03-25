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

  /**
   * Register a handler to receive form lifecycle events.
   * @param handler Function to be called when form lifecycle events occur
   * @returns A function to unsubscribe from lifecycle events
   */
  registerFormLifecycleHandler(handler: FormLifecycleHandler): () => void;
}

/**
 * Configuration for in-app forms
 */
export interface FormConfiguration {
  /**
   * Duration in seconds before the session times out
   */
  readonly sessionTimeoutDuration: number;
}

/**
 * Discriminated union representing a form lifecycle event.
 *
 * Each variant carries contextual data about the form, and the `type` field
 * serves as the discriminant. Use a `switch` on `event.type` to narrow the type
 * and access variant-specific fields like `buttonLabel` and `deepLinkUrl`.
 *
 * Example usage:
 * ```typescript
 * Klaviyo.registerFormLifecycleHandler((event) => {
 *   switch (event.type) {
 *     case 'formShown':
 *       console.log(`Form shown: ${event.formId}`);
 *       break;
 *     case 'formDismissed':
 *       console.log(`Form dismissed: ${event.formId}`);
 *       break;
 *     case 'formCtaClicked':
 *       console.log(`CTA clicked: ${event.buttonLabel}, deep link: ${event.deepLinkUrl}`);
 *       break;
 *   }
 * });
 * ```
 */
export type FormLifecycleEvent =
  | { type: 'formShown'; formId?: string; formName?: string }
  | { type: 'formDismissed'; formId?: string; formName?: string }
  | {
      type: 'formCtaClicked';
      formId?: string;
      formName?: string;
      buttonLabel?: string;
      deepLinkUrl?: string;
    };

/**
 * Handler function type for form lifecycle events
 */
export type FormLifecycleHandler = (event: FormLifecycleEvent) => void;
