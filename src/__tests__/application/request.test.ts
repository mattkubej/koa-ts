import request from 'supertest';
import Koa from '../../application';
import Context from '../../context';

describe('app.request', () => {
  const app1 = new Koa();
  (app1.request as any).message = 'hello';
  const app2 = new Koa();

  it('should merge properties', () => {
    app1.use((ctx: Context) => {
      expect((ctx.request as any).message).toBe('hello');
      ctx.status = 204;
    });

    return request(app1.listen())
      .get('/')
      .expect(204);
  });

  it('should not affect the original prototype', () => {
    app2.use((ctx: Context) => {
      expect((ctx.request as any).message).toBeUndefined();
      ctx.status = 204;
    });

    return request(app2.listen())
      .get('/')
      .expect(204);
  });
});
