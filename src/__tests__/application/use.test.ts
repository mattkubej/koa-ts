import request from 'supertest';
import Koa from '../../application';
import Context from '../../context';

describe('app.use(fn)', () => {
  it('should compose middleware', async() => {
    const app = new Koa();
    const calls = [];

    app.use((_: Context, next: Function) => {
      calls.push(1);
      return next().then(() => {
        calls.push(6);
      });
    });

    app.use((_: Context, next: Function) => {
      calls.push(2);
      return next().then(() => {
        calls.push(5);
      });
    });

    app.use((_: Context, next: Function) => {
      calls.push(3);
      return next().then(() => {
        calls.push(4);
      });
    });

    const server = app.listen();

    await request(server)
      .get('/')
      .expect(404);

    expect(calls).toStrictEqual([1, 2, 3, 4, 5, 6]);
  });

  it('should compose mixed middleware', async() => {
    process.once('deprecation', () => {}); // silence deprecation message
    const app = new Koa();
    const calls = [];

    app.use((_: Context, next: Function) => {
      calls.push(1);
      return next().then(() => {
        calls.push(6);
      });
    });

    app.use(function * (next: Function) {
      calls.push(2);
      yield next;
      calls.push(5);
    });

    app.use((_: Context, next: Function) => {
      calls.push(3);
      return next().then(() => {
        calls.push(4);
      });
    });

    const server = app.listen();

    await request(server)
      .get('/')
      .expect(404);

    expect(calls).toStrictEqual([1, 2, 3, 4, 5, 6]);
  });

  // https://github.com/koajs/koa/pull/530#issuecomment-148138051
  it('should catch thrown errors in non-async functions', async() => {
    const app = new Koa();

    app.use((ctx: Context) => ctx.throw('Not Found', 404));

    const response = await request(app.callback()).get('/');
    expect(response.status).toBe(404);
  });

  it('should accept both generator and function middleware', async() => {
    process.once('deprecation', () => {}); // silence deprecation message
    const app = new Koa();

    app.use((_: Context, next: Function) => next());
    app.use(function * () { this.body = 'generator'; });

    const response = await request(app.callback()).get('/');
    expect(response.status).toBe(200);
    expect(response.text).toBe('generator');
  });

  it('should throw error for non function', () => {
    const app = new Koa();

    [null, undefined, 0, false, 'not a function'].forEach(v => {
      expect(() => (app as any).use(v)).toThrow(/middleware must be a function!/);
    });
  });

  it('should output deprecation message for generator functions', () => {
    return new Promise(done => {
      process.once('deprecation', message => {
        expect(/Support for generators will be removed/.test(String(message))).toBeTruthy();
        done();
      });

      const app = new Koa();
      app.use(function * () {});
    });
  });
});
