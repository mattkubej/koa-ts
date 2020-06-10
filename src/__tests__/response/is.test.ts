import context from '../helpers/context';

describe('response.is(type)', () => {
  it('should ignore params', () => {
    const res = context().response;
    res.type = 'text/html; charset=utf-8';

    expect(res.is('text/*')).toBe('text/html');
  });

  describe('when no type is set', () => {
    it('should return false', () => {
      const res = context().response;

      expect(res.is()).toBeFalsy();
      expect(res.is('html')).toBeFalsy();
    });
  });

  describe('when given no types', () => {
    it('should return the type', () => {
      const res = context().response;
      res.type = 'text/html; charset=utf-8';

      expect(res.is()).toBe('text/html');
    });
  });

  describe('given one type', () => {
    it('should return the type or false', () => {
      const res = context().response;
      res.type = 'image/png';

      expect(res.is('png')).toBe('png');
      expect(res.is('.png')).toBe('.png');
      expect(res.is('image/png')).toBe('image/png');
      expect(res.is('image/*')).toBe('image/png');
      expect(res.is('*/png')).toBe('image/png');

      expect(res.is('jpeg')).toBeFalsy();
      expect(res.is('.jpeg')).toBeFalsy();
      expect(res.is('image/jpeg')).toBeFalsy();
      expect(res.is('text/*')).toBeFalsy();
      expect(res.is('*/jpeg')).toBeFalsy();
    });
  });

  describe('given multiple types', () => {
    it('should return the first match or false', () => {
      const res = context().response;
      res.type = 'image/png';

      expect(res.is('png')).toBe('png');
      expect(res.is('.png')).toBe('.png');
      expect(res.is('text/*', 'image/*')).toBe('image/png');
      expect(res.is('image/*', 'text/*')).toBe('image/png');
      expect(res.is('image/*', 'image/png')).toBe('image/png');
      expect(res.is('image/png', 'image/*')).toBe('image/png');

      expect(res.is(['text/*', 'image/*'])).toBe('image/png');
      expect(res.is(['image/*', 'text/*'])).toBe('image/png');
      expect(res.is(['image/*', 'image/png'])).toBe('image/png');
      expect(res.is(['image/png', 'image/*'])).toBe('image/png');

      expect(res.is('jpeg')).toBeFalsy();
      expect(res.is('.jpeg')).toBeFalsy();
      expect(res.is('text/*', 'application/*')).toBeFalsy();
      expect(res.is('text/html', 'text/plain', 'application/json; charset=utf-8')).toBeFalsy();
    });
  });

  describe('when Content-Type: application/x-www-form-urlencoded', () => {
    it('should match "urlencoded"', () => {
      const res = context().response;
      res.type = 'application/x-www-form-urlencoded';

      expect(res.is('urlencoded')).toBe('urlencoded');
      expect(res.is('json', 'urlencoded')).toBe('urlencoded');
      expect(res.is('urlencoded', 'json')).toBe('urlencoded');
    });
  });
});
