import { request } from '../helpers/context';

describe('req.URL', () => {
  describe('should not throw when', () => {
    it('host is void', () => {
      // Accessing the URL should not throw.
      expect(() => request().URL).not.toThrow();
    });

    it('header.host is invalid', () => {
      const req = request();
      req.header.host = 'invalid host';
      // Accessing the URL should not throw.
      expect(() => req.URL).not.toThrow();
    });
  });

  it('should return empty object when invalid', () => {
    const req = request();
    req.header.host = 'invalid host';
    expect(req.URL).toMatchObject(Object.create(null));
  });
});
