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
  it('extracts the message from an Error', () => {
    expect(classifyProviderError(new Error('boom'))).toEqual({
      message: 'boom',
      isConnectivityError: false,
    });
  });

  it('stringifies a non-Error rejection', () => {
    expect(classifyProviderError('plain string')).toEqual({
      message: 'plain string',
      isConnectivityError: false,
    });
  });

  it('honors an explicit isConnectivityError marker', () => {
    const error = Object.assign(new Error('offline'), {
      isConnectivityError: true,
    });

    expect(classifyProviderError(error)).toEqual({
      message: 'offline',
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

    expect(classifyProviderError(error)).toEqual({
      message: 'Network request failed',
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

  it('does not classify an unrelated error as connectivity', () => {
    expect(
      classifyProviderError(new Error('HTTP 500')).isConnectivityError
    ).toBe(false);
  });
});
