import request from 'supertest';
import Koa from '../../application';
import Context from '../../context';

describe('app.context', () => {
  const app1 = new Koa();
  (app1.context as any).msg = 'hello';
  const app2 = new Koa();

  it('should merge properties', () => {
    app1.use((ctx: Context) => {
      expect((ctx as any).msg).toBe('hello');
      ctx.status = 204;
    });

    return request(app1.listen())
      .get('/')
      .expect(204);
  });

  it('should not affect the original prototype', () => {
    app2.use((ctx: Context) => {
      expect((ctx as any).msg).toBeUndefined();
      ctx.status = 204;
    });

    return request(app2.listen())
      .get('/')
      .expect(204);
  });
});
