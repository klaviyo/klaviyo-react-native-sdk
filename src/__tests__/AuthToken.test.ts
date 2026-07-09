import { parseAuthTokenRequestedEvent } from '../AuthToken';

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
