import { request } from '../helpers/context';

describe('ctx.idempotent', () => {
  describe('when the request method is idempotent', () => {
    it('should return true', () => {
      ['GET', 'HEAD', 'PUT', 'DELETE', 'OPTIONS', 'TRACE'].forEach(check);
      function check(method: string){
        const req = request();
        req.method = method;
        expect(req.idempotent).toBeTruthy();
      }
    });
  });

  describe('when the request method is not idempotent', () => {
    it('should return false', () => {
      const req = request();
      req.method = 'POST';
      expect(req.idempotent).toBeFalsy();
    });
  });
});
