/**
 * A stand-in for the wrapper's `InboxError`, close enough for `instanceof`
 * and the stable `code` the Inbox hook branches on.
 *
 * The real class lives in the SDK's `Inbox.ts`. A jest run cannot import it:
 * the package root touches the native module, which is not linked in tests.
 */
export class MockInboxError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'InboxError';
    this.code = code;
    Object.setPrototypeOf(this, MockInboxError.prototype);
  }
}
