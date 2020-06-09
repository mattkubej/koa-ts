import { request } from '../helpers/context';

describe('req.charset', () => {
  describe('with no content-type present', () => {
    it('should return ""', () => {
      const req = request();
      expect(req.charset).toBe('');
    });
  });

  describe('with charset present', () => {
    it('should return ""', () => {
      const req = request();
      req.header['content-type'] = 'text/plain';
      expect(req.charset).toBe('');
    });
  });

  describe('with a charset', () => {
    it('should return the charset', () => {
      const req = request();
      req.header['content-type'] = 'text/plain; charset=utf-8';
      expect(req.charset).toBe('utf-8');
    });

    it('should return "" if content-type is invalid', () => {
      const req = request();
      req.header['content-type'] = 'application/json; application/text; charset=utf-8';
      expect(req.charset).toBe('');
    });
  });
});
