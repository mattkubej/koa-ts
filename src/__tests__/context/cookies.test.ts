import request from 'supertest';
import Koa from '../../application';
import Context from '../../context';

describe('ctx.cookies', () => {
  describe('ctx.cookies.set()', () => {
    it('should set an unsigned cookie', async() => {
      const app = new Koa();

      app.use((ctx: Context) => {
        ctx.cookies.set('name', 'jon');
        ctx.status = 204;
      });

      const server = app.listen();

      const res = await request(server)
        .get('/')
        .expect(204);

      const cookie = res.headers['set-cookie'].some((cookie: string) => /^name=/.test(cookie));
      expect(cookie).toBeTruthy();
    });

    describe('with .signed', () => {
      describe('when no .keys are set', () => {
        it('should error', () => {
          const app = new Koa();

          app.use((ctx: Context) => {
            try {
              ctx.cookies.set('foo', 'bar', { signed: true });
            } catch (err) {
              ctx.body = err.message;
            }
          });

          return request(app.callback())
            .get('/')
            .expect('.keys required for signed cookies');
        });
      });

      it('should send a signed cookie', async() => {
        const app = new Koa();

        app.keys = ['a', 'b'];

        app.use((ctx: Context) => {
          ctx.cookies.set('name', 'jon', { signed: true });
          ctx.status = 204;
        });

        const server = app.listen();

        const res = await request(server)
          .get('/')
          .expect(204);

        const cookies = res.headers['set-cookie'];

        expect(cookies.some((cookie: string) => /^name=/.test(cookie))).toBeTruthy();
        expect(cookies.some((cookie: string) => /(,|^)name\.sig=/.test(cookie))).toBeTruthy();
      });
    });

    describe('with secure', () => {
      it('should get secure from request', async() => {
        const app = new Koa();

        app.proxy = true;
        app.keys = ['a', 'b'];

        app.use((ctx: Context) => {
          ctx.cookies.set('name', 'jon', { signed: true });
          ctx.status = 204;
        });

        const server = app.listen();

        const res = await request(server)
          .get('/')
          .set('x-forwarded-proto', 'https') // mock secure
          .expect(204);

        const cookies = res.headers['set-cookie'];
        expect(cookies.some((cookie: string) => /^name=/.test(cookie))).toBeTruthy();
        expect(cookies.some((cookie: string) => /(,|^)name\.sig=/.test(cookie))).toBeTruthy();
        expect(cookies.every((cookie: string) => /secure/.test(cookie))).toBeTruthy();
      });
    });
  });

  describe('ctx.cookies=', () => {
    it('should override cookie work', async() => {
      const app = new Koa();

      app.use((ctx: Context) => {
        ctx.cookies = {
          set(key: string, value: string) {
            ctx.set(key, value);
          }
        };
        ctx.cookies.set('name', 'jon');
        ctx.status = 204;
      });

      const server = app.listen();

      await request(server)
        .get('/')
        .expect('name', 'jon')
        .expect(204);
    });
  });
});
