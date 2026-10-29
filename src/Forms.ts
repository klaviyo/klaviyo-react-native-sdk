import { isNonEmptyString } from './validation';

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
   * Start a draft in-app forms preview session with a preview token from the Klaviyo form editor.
   *
   * Starting a preview is like unregistering and registering again: if forms are registered, the
   * current session is torn down, dismissing any form on screen, and a new session starts that
   * loads draft forms. If {@link registerForInAppForms} hasn't been called yet, the token is held
   * and the preview starts when forms register; no forms are shown before then.
   *
   * A preview token is a short-lived credential for on-device testing of draft forms. The native
   * SDKs keep it in memory only and never persist or log it. A malformed token is ignored and
   * changes nothing. {@link unregisterFromInAppForms} also ends the preview.
   * @param token The preview token
   */
  startFormsPreview(token: string): void;

  /**
   * End the draft in-app forms preview session. If forms are registered, they restart with
   * published forms.
   */
  endFormsPreview(): void;

  /**
   * Start a forms preview from a deep link, such as the link or QR code from the Klaviyo form
   * editor's **Preview on device** button.
   *
   * Forwards the link to the native SDK and resolves `true` only when the native SDK started a
   * preview — that is, the link carries a well-formed `klaviyo-forms-preview` token. Resolves
   * `false`, changing nothing, for a null, empty, or non-preview link, for an unparsable link,
   * and on any native failure, so call it first from your deep link handling (for example a
   * `Linking` URL listener) and fall through when it resolves `false`.
   *
   * Never rejects: safe to call before [Klaviyo.initialize] for cold-start links; the native
   * SDKs hold the token until forms register.
   * @param url The deep link that opened the app
   * @returns Resolves `true` if the link started a forms preview, `false` otherwise
   */
  handleFormsPreviewLink(url: string | null): Promise<boolean>;

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
 * Key carrying a forms preview token as a deep link query parameter
 */
export const FORMS_PREVIEW_TOKEN_KEY = 'klaviyo-forms-preview';

/**
 * String constants for form lifecycle event types.
 *
 * These values match the `type` discriminants emitted by the native bridge
 * and are safe to use when comparing {@link FormLifecycleEvent#type} or
 * building dispatch tables keyed by event type.
 */
export const FormLifecycleEventType = {
  /** Emitted when a form is shown to the user. */
  Shown: 'formShown',
  /** Emitted when the user dismisses a visible form. */
  Dismissed: 'formDismissed',
  /** Emitted when the user taps a CTA button with a configured deep link. */
  CtaClicked: 'formCtaClicked',
} as const;

/** Union of valid {@link FormLifecycleEvent} type discriminants. */
export type FormLifecycleEventType =
  (typeof FormLifecycleEventType)[keyof typeof FormLifecycleEventType];

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
 *     case FormLifecycleEventType.Shown:
 *       console.log(`Form shown: ${event.formId}`);
 *       break;
 *     case FormLifecycleEventType.Dismissed:
 *       console.log(`Form dismissed: ${event.formId}`);
 *       break;
 *     case FormLifecycleEventType.CtaClicked:
 *       console.log(`CTA clicked: ${event.buttonLabel}, deep link: ${event.deepLinkUrl}`);
 *       break;
 *   }
 * });
 * ```
 */
export type FormLifecycleEvent =
  /** Triggered when a form is shown to the user. Fired after the SDK has initiated form presentation. */
  | {
      type: typeof FormLifecycleEventType.Shown;
      formId: string;
      formName: string;
    }
  /**
   * Triggered when a form is dismissed by the user. Fired after the SDK has initiated form dismissal.
   * Fires for user-initiated dismissals (e.g. tapping outside, close button).
   * Does not fire when the SDK tears down the form internally (session timeouts, aborts).
   */
  | {
      type: typeof FormLifecycleEventType.Dismissed;
      formId: string;
      formName: string;
    }
  /**
   * Triggered when a user taps a call-to-action (CTA) button in a form that has a deep link URL configured.
   * Fired after the SDK has initiated deep link navigation.
   * Not emitted if no deep link URL is configured for the CTA.
   */
  | {
      type: typeof FormLifecycleEventType.CtaClicked;
      formId: string;
      formName: string;
      /**
       * Label of the tapped CTA button. May be an empty string when the
       * button has no visible label configured.
       */
      buttonLabel: string;
      /**
       * Deep link URL configured for the tapped CTA. Always present and
       * non-empty — this event is not emitted when no deep link is configured.
       */
      deepLinkUrl: string;
    };

/**
 * Handler function type for form lifecycle events
 */
export type FormLifecycleHandler = (event: FormLifecycleEvent) => void;

const FORM_LIFECYCLE_EVENT_TYPES: readonly FormLifecycleEventType[] =
  Object.values(FormLifecycleEventType);

/**
 * Parses a raw native event payload into a validated {@link FormLifecycleEvent}.
 *
 * Returns `null` and logs a warning if required fields are missing or empty.
 * Required fields vary by event type:
 * - All events: `type`, `formId`, `formName`
 * - `formCtaClicked`: additionally requires `deepLinkUrl`; `buttonLabel` defaults to empty string if absent
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
    !FORM_LIFECYCLE_EVENT_TYPES.includes(type as FormLifecycleEventType)
  ) {
    console.warn(
      `[Klaviyo] Ignoring form lifecycle event with invalid type: ${JSON.stringify(type)}`
    );
    return null;
  }

  const missingFields: string[] = [];
  if (!isNonEmptyString(formId)) missingFields.push('formId');
  if (!isNonEmptyString(formName)) missingFields.push('formName');

  if (type === FormLifecycleEventType.CtaClicked) {
    if (!isNonEmptyString(data.deepLinkUrl)) missingFields.push('deepLinkUrl');
  }

  if (missingFields.length > 0) {
    console.warn(
      `[Klaviyo] Ignoring ${type} event: missing required field(s): ${missingFields.join(', ')}`
    );
    return null;
  }

  const validatedType = type as FormLifecycleEventType;
  const validFormId = formId as string;
  const validFormName = formName as string;

  switch (validatedType) {
    case FormLifecycleEventType.Shown:
      return {
        type: validatedType,
        formId: validFormId,
        formName: validFormName,
      };
    case FormLifecycleEventType.Dismissed:
      return {
        type: validatedType,
        formId: validFormId,
        formName: validFormName,
      };
    case FormLifecycleEventType.CtaClicked:
      return {
        type: validatedType,
        formId: validFormId,
        formName: validFormName,
        buttonLabel:
          typeof data.buttonLabel === 'string' ? data.buttonLabel : '',
        deepLinkUrl: data.deepLinkUrl as string,
      };
  }
}
