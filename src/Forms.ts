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
  | { type: 'formShown'; formId: string; formName: string }
  | { type: 'formDismissed'; formId: string; formName: string }
  | {
      type: 'formCtaClicked';
      formId: string;
      formName: string;
      buttonLabel: string;
      deepLinkUrl: string;
    };

/**
 * Handler function type for form lifecycle events
 */
export type FormLifecycleHandler = (event: FormLifecycleEvent) => void;

/**
 * Valid form lifecycle event type discriminants
 */
const FORM_LIFECYCLE_EVENT_TYPES = [
  'formShown',
  'formDismissed',
  'formCtaClicked',
] as const;

/**
 * Validates that a value is a non-empty string.
 */
function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

/**
 * Parses a raw native event payload into a validated {@link FormLifecycleEvent}.
 *
 * Returns `null` and logs a warning if required fields are missing or empty.
 * Required fields vary by event type:
 * - All events: `type`, `formId`, `formName`
 * - `formCtaClicked`: additionally requires `buttonLabel`
 *
 * @param data Raw event data from the native bridge
 * @returns A validated FormLifecycleEvent, or null if the payload is invalid
 */
export function parseFormLifecycleEvent(
  data: Record<string, unknown>
): FormLifecycleEvent | null {
  const { type, formId, formName } = data;

  if (
    !isNonEmptyString(type) ||
    !FORM_LIFECYCLE_EVENT_TYPES.includes(
      type as (typeof FORM_LIFECYCLE_EVENT_TYPES)[number]
    )
  ) {
    console.error(
      `[Klaviyo] Ignoring form lifecycle event with invalid type: ${JSON.stringify(type)}`
    );
    return null;
  }

  const missingFields: string[] = [];
  if (!isNonEmptyString(formId)) missingFields.push('formId');
  if (!isNonEmptyString(formName)) missingFields.push('formName');

  if (type === 'formCtaClicked' && !isNonEmptyString(data.buttonLabel)) {
    missingFields.push('buttonLabel');
  }

  if (missingFields.length > 0) {
    console.error(
      `[Klaviyo] Ignoring ${type} event: missing required field(s): ${missingFields.join(', ')}`
    );
    return null;
  }

  const validatedType = type as FormLifecycleEvent['type'];
  const validFormId = formId as string;
  const validFormName = formName as string;

  switch (validatedType) {
    case 'formShown':
      return {
        type: validatedType,
        formId: validFormId,
        formName: validFormName,
      };
    case 'formDismissed':
      return {
        type: validatedType,
        formId: validFormId,
        formName: validFormName,
      };
    case 'formCtaClicked':
      return {
        type: validatedType,
        formId: validFormId,
        formName: validFormName,
        buttonLabel: data.buttonLabel as string,
        deepLinkUrl:
          typeof data.deepLinkUrl === 'string' ? data.deepLinkUrl : '',
      };
  }
}
