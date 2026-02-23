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
 * Interface for an event
 */
export interface FormConfiguration {
  /**
   * Duration in seconds before the session times out
   */
  readonly sessionTimeoutDuration: number;
}

/**
 * Form lifecycle event types
 */
export enum FormLifecycleEvent {
  /** Form is shown/presented to the user */
  FORM_SHOWN = 'form_shown',
  /** Form was dismissed by the user */
  FORM_DISMISSED = 'form_dismissed',
  /** Form CTA was clicked by the user */
  FORM_CTA_CLICKED = 'form_cta_clicked',
}

/**
 * Data associated with a form lifecycle event
 */
export interface FormLifecycleEventData {
  /** The type of lifecycle event */
  event: FormLifecycleEvent;
  /** The form ID associated with this event */
  formId: string;
}

/**
 * Handler function type for form lifecycle events
 */
export type FormLifecycleHandler = (data: FormLifecycleEventData) => void;
