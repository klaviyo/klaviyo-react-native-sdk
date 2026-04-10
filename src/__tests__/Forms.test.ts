import { parseFormLifecycleEvent } from '../Forms';

describe('parseFormLifecycleEvent', () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe('valid events', () => {
    it('parses a valid formShown event', () => {
      const result = parseFormLifecycleEvent({
        type: 'formShown',
        formId: 'abc123',
        formName: 'Welcome Form',
      });

      expect(result).toEqual({
        type: 'formShown',
        formId: 'abc123',
        formName: 'Welcome Form',
      });
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it('parses a valid formDismissed event', () => {
      const result = parseFormLifecycleEvent({
        type: 'formDismissed',
        formId: 'abc123',
        formName: 'Welcome Form',
      });

      expect(result).toEqual({
        type: 'formDismissed',
        formId: 'abc123',
        formName: 'Welcome Form',
      });
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it('parses a valid formCtaClicked event with all fields', () => {
      const result = parseFormLifecycleEvent({
        type: 'formCtaClicked',
        formId: 'abc123',
        formName: 'Welcome Form',
        buttonLabel: 'Shop Now',
        deepLinkUrl: 'myapp://products',
      });

      expect(result).toEqual({
        type: 'formCtaClicked',
        formId: 'abc123',
        formName: 'Welcome Form',
        buttonLabel: 'Shop Now',
        deepLinkUrl: 'myapp://products',
      });
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it('defaults deepLinkUrl to empty string when absent', () => {
      const result = parseFormLifecycleEvent({
        type: 'formCtaClicked',
        formId: 'abc123',
        formName: 'Welcome Form',
        buttonLabel: 'Shop Now',
      });

      expect(result).toEqual({
        type: 'formCtaClicked',
        formId: 'abc123',
        formName: 'Welcome Form',
        buttonLabel: 'Shop Now',
        deepLinkUrl: '',
      });
    });

    it('strips extra fields not part of the event type', () => {
      const result = parseFormLifecycleEvent({
        type: 'formShown',
        formId: 'abc123',
        formName: 'Welcome Form',
        unexpectedField: 'should be ignored',
      });

      expect(result).toEqual({
        type: 'formShown',
        formId: 'abc123',
        formName: 'Welcome Form',
      });
    });
  });

  describe('invalid type', () => {
    it('returns null for unknown type', () => {
      const result = parseFormLifecycleEvent({
        type: 'formExploded',
        formId: 'abc123',
        formName: 'Welcome Form',
      });

      expect(result).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('invalid type: "formExploded"')
      );
    });

    it('returns null for missing type', () => {
      const result = parseFormLifecycleEvent({
        formId: 'abc123',
        formName: 'Welcome Form',
      });

      expect(result).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('invalid type')
      );
    });

    it('returns null for empty string type', () => {
      const result = parseFormLifecycleEvent({
        type: '',
        formId: 'abc123',
        formName: 'Welcome Form',
      });

      expect(result).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('invalid type')
      );
    });

    it('returns null for non-string type', () => {
      const result = parseFormLifecycleEvent({
        type: 42,
        formId: 'abc123',
        formName: 'Welcome Form',
      });

      expect(result).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('invalid type')
      );
    });
  });

  describe('missing required fields', () => {
    it('returns null when formId is missing', () => {
      const result = parseFormLifecycleEvent({
        type: 'formShown',
        formName: 'Welcome Form',
      });

      expect(result).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('missing required field(s): formId')
      );
    });

    it('returns null when formName is missing', () => {
      const result = parseFormLifecycleEvent({
        type: 'formShown',
        formId: 'abc123',
      });

      expect(result).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('missing required field(s): formName')
      );
    });

    it('returns null when formId is empty string', () => {
      const result = parseFormLifecycleEvent({
        type: 'formDismissed',
        formId: '',
        formName: 'Welcome Form',
      });

      expect(result).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('formId')
      );
    });

    it('returns null when formName is empty string', () => {
      const result = parseFormLifecycleEvent({
        type: 'formDismissed',
        formId: 'abc123',
        formName: '',
      });

      expect(result).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('formName')
      );
    });

    it('returns null when buttonLabel is missing for formCtaClicked', () => {
      const result = parseFormLifecycleEvent({
        type: 'formCtaClicked',
        formId: 'abc123',
        formName: 'Welcome Form',
        deepLinkUrl: 'myapp://products',
      });

      expect(result).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('missing required field(s): buttonLabel')
      );
    });

    it('returns null when buttonLabel is empty string for formCtaClicked', () => {
      const result = parseFormLifecycleEvent({
        type: 'formCtaClicked',
        formId: 'abc123',
        formName: 'Welcome Form',
        buttonLabel: '',
        deepLinkUrl: 'myapp://products',
      });

      expect(result).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('buttonLabel')
      );
    });

    it('reports multiple missing fields together', () => {
      const result = parseFormLifecycleEvent({
        type: 'formCtaClicked',
      });

      expect(result).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('formId, formName, buttonLabel')
      );
    });

    it('does not require buttonLabel for formShown', () => {
      const result = parseFormLifecycleEvent({
        type: 'formShown',
        formId: 'abc123',
        formName: 'Welcome Form',
      });

      expect(result).not.toBeNull();
    });

    it('does not require buttonLabel for formDismissed', () => {
      const result = parseFormLifecycleEvent({
        type: 'formDismissed',
        formId: 'abc123',
        formName: 'Welcome Form',
      });

      expect(result).not.toBeNull();
    });
  });
});
