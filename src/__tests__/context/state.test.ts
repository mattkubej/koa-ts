import request from 'supertest';
import Koa from '../../application';
import Context from '../../context';

describe('ctx.state', () => {
  it('should provide a ctx.state namespace', () => {
    const app = new Koa();

    app.use((ctx: Context) => {
      expect(ctx.state).toStrictEqual({});
    });

    const server = app.listen();

    return request(server)
      .get('/')
      .expect(404);
  });
});
