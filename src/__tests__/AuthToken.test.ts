import {
  classifyProviderError,
  parseAuthTokenRequestedEvent,
} from '../AuthToken';

describe('parseAuthTokenRequestedEvent', () => {
  let consoleWarnSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
  });

  describe('valid events', () => {
    it('parses an event with a non-empty id', () => {
      const result = parseAuthTokenRequestedEvent({ id: 'req-123' });

      expect(result).toEqual({ id: 'req-123' });
      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });

    it('ignores extra fields and returns only the id', () => {
      const result = parseAuthTokenRequestedEvent({
        id: 'req-123',
        unexpected: 'field',
      });

      expect(result).toEqual({ id: 'req-123' });
      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });
  });

  describe('invalid events', () => {
    it('returns null and warns when id is missing', () => {
      const result = parseAuthTokenRequestedEvent({});

      expect(result).toBeNull();
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('invalid id')
      );
    });

    it('returns null when id is an empty string', () => {
      const result = parseAuthTokenRequestedEvent({ id: '' });

      expect(result).toBeNull();
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('invalid id')
      );
    });

    it('returns null when id is whitespace-only', () => {
      const result = parseAuthTokenRequestedEvent({ id: '   ' });

      expect(result).toBeNull();
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('invalid id')
      );
    });

    it('returns null when id is not a string', () => {
      const result = parseAuthTokenRequestedEvent({ id: 42 });

      expect(result).toBeNull();
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('invalid id')
      );
    });

    it('returns null when id is null', () => {
      const result = parseAuthTokenRequestedEvent({ id: null });

      expect(result).toBeNull();
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('invalid id')
      );
    });
  });
});

describe('classifyProviderError', () => {
  it('reports the error type, not host-controlled text', () => {
    // The message must be redacted to the error's type — never error.message,
    // which could contain the JWT.
    expect(classifyProviderError(new Error('boom'))).toEqual({
      message: 'Error',
      isConnectivityError: false,
    });
  });

  it('never surfaces host-controlled exception text', () => {
    const error = new Error(
      'failed with token=eyJhbGciOiJIUzI1NiJ9.secret.sig'
    );

    const { message } = classifyProviderError(error);
    expect(message).not.toContain('secret');
    expect(message).not.toContain('eyJ');
    expect(message).toBe('Error');
  });

  it('reports the typeof for a non-Error rejection', () => {
    expect(classifyProviderError('plain string')).toEqual({
      message: 'string',
      isConnectivityError: false,
    });
  });

  it('honors an explicit isConnectivityError marker', () => {
    const error = Object.assign(new Error('offline'), {
      isConnectivityError: true,
    });

    expect(classifyProviderError(error)).toEqual({
      message: 'Error',
      isConnectivityError: true,
    });
  });

  it('does not classify when the marker is not exactly true', () => {
    const error = Object.assign(new Error('nope'), {
      isConnectivityError: 'yes',
    });

    expect(classifyProviderError(error).isConnectivityError).toBe(false);
  });

  it("auto-detects React Native's fetch network failure", () => {
    const error = new TypeError('Network request failed');

    // Message is redacted to the type, but connectivity detection still keys
    // off the raw text internally, so the flag must remain true.
    expect(classifyProviderError(error)).toEqual({
      message: 'TypeError',
      isConnectivityError: true,
    });
  });

  it('auto-detects an AbortError', () => {
    const error = Object.assign(new Error('aborted'), { name: 'AbortError' });

    expect(classifyProviderError(error).isConnectivityError).toBe(true);
  });

  it('does not classify a generic TypeError as connectivity', () => {
    const error = new TypeError('x is not a function');

    expect(classifyProviderError(error).isConnectivityError).toBe(false);
  });

  it('lets an explicit false marker opt out of auto-detection', () => {
    // A fetch-style network failure that the host explicitly marks as
    // non-connectivity must be honored (explicit boolean wins).
    const error = Object.assign(new TypeError('Network request failed'), {
      isConnectivityError: false,
    });

    expect(classifyProviderError(error).isConnectivityError).toBe(false);
  });

  it('does not classify an unrelated error as connectivity', () => {
    expect(
      classifyProviderError(new Error('HTTP 500')).isConnectivityError
    ).toBe(false);
  });
});
