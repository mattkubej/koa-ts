import Koa from '../application';
import Context from '../context';
import request from 'supertest';

describe('app', () => {
  it('should handle socket errors', done => {
    const app = new Koa();

    app.use((ctx: Context) => {
      // triggers ctx.socket.writable == false
      ctx.socket.emit('error', new Error('boom'));
    });

    app.on('error', err => {
      expect(err.message).toBe('boom');
      done();
    });

    request(app.callback()).get('/').end(() => {});
  });

  it('should not .writeHead when !socket.writable', done => {
    const app = new Koa();

    app.use((ctx: Context) => {
      // set .writable to false, TS hack
      (ctx.socket as any).writable = false;
      ctx.status = 204;
      // throw if .writeHead or .end is called
      ctx.res.writeHead =
      ctx.res.end = () => {
        fail('response sent');
      };

      // hack to cancel request second later
      setTimeout(() => {
        ctx.req.destroy();
        done();
      }, 1);
    });

    request(app.callback())
      .get('/')
      .end(() => {});
  });
});
