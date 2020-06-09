import context from '../helpers/context';

describe('ctx.acceptsEncodings()', () => {
  describe('with no arguments', () => {
    describe('when Accept-Encoding is populated', () => {
      it('should return accepted types', () => {
        const ctx = context();
        ctx.req.headers['accept-encoding'] = 'gzip, compress;q=0.2';
        expect(ctx.acceptsEncodings()).toStrictEqual(['gzip', 'compress', 'identity']);
        expect(ctx.acceptsEncodings('gzip', 'compress')).toBe('gzip');
      });
    });

    describe('when Accept-Encoding is not populated', () => {
      it('should return identity', () => {
        const ctx = context();
        expect(ctx.acceptsEncodings()).toStrictEqual(['identity']);
        expect(ctx.acceptsEncodings('gzip', 'deflate', 'identity')).toBe('identity');
      });
    });
  });

  describe('with multiple arguments', () => {
    it('should return the best fit', () => {
      const ctx = context();
      ctx.req.headers['accept-encoding'] = 'gzip, compress;q=0.2';
      expect(ctx.acceptsEncodings('compress', 'gzip')).toBe('gzip');
      expect(ctx.acceptsEncodings('gzip', 'compress')).toBe('gzip');
    });
  });

  describe('with an array', () => {
    it('should return the best fit', () => {
      const ctx = context();
      ctx.req.headers['accept-encoding'] = 'gzip, compress;q=0.2';
      expect(ctx.acceptsEncodings(['compress', 'gzip'])).toBe('gzip');
    });
  });
});
