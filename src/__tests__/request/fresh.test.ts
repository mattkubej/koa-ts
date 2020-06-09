import context from '../helpers/context';

describe('ctx.fresh', () => {
  describe('the request method is not GET and HEAD', () => {
    it('should return false', () => {
      const ctx = context();
      ctx.req.method = 'POST';
      expect(ctx.fresh).toBeFalsy();
    });
  });

  describe('the response is non-2xx', () => {
    it('should return false', () => {
      const ctx = context();
      ctx.status = 404;
      ctx.req.method = 'GET';
      ctx.req.headers['if-none-match'] = '123';
      ctx.set('ETag', '123');
      expect(ctx.fresh).toBeFalsy();
    });
  });

  describe('the response is 2xx', () => {
    describe('and etag matches', () => {
      it('should return true', () => {
        const ctx = context();
        ctx.status = 200;
        ctx.req.method = 'GET';
        ctx.req.headers['if-none-match'] = '123';
        ctx.set('ETag', '123');
        expect(ctx.fresh).toBeTruthy();
      });
    });

    describe('and etag do not match', () => {
      it('should return false', () => {
        const ctx = context();
        ctx.status = 200;
        ctx.req.method = 'GET';
        ctx.req.headers['if-none-match'] = '123';
        ctx.set('ETag', 'hey');
        expect(ctx.fresh).toBeFalsy();
      });
    });
  });
});
