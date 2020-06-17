import request from 'supertest';
import Koa from '../../application';
import Context from '../../context';

describe('app', () => {
  it('should handle socket errors', () => {
    return new Promise(resolve => {
      const app = new Koa();

      app.use((ctx: Context) => {
      // triggers ctx.socket.writable == false
        ctx.socket.emit('error', new Error('boom'));
      });

      app.on('error', err => {
        expect(err.message).toBe('boom');
        resolve();
      });

      request(app.callback()).get('/').end(() => {});
    });
  });

  it('should not .writeHead when !socket.writable', () => {
    return new Promise(resolve => {
      const app = new Koa();

      app.use((ctx: Context) => {
        // set .writable to false, TS hack
        (ctx.socket as any).writable = false;
        ctx.status = 204;
        // throw if .writeHead or .end is called
        ctx.res.writeHead = ctx.res.end = () => {
          throw new Error('response sent');
        };

        // hack to cancel request second later
        setTimeout(() => {
          ctx.req.destroy();
          resolve();
        }, 1);
      });

      expect(() => request(app.callback()).get('/').end(() => {})).not.toThrow();
    });
  });

  it('should set development env when NODE_ENV missing', () => {
    const NODE_ENV = process.env.NODE_ENV;
    process.env.NODE_ENV = '';
    const app = new Koa();
    process.env.NODE_ENV = NODE_ENV;
    expect(app.env).toBe('development');
  });

  it('should set env from the constructor', () => {
    const env = 'custom';
    const app = new Koa({ env });
    expect(app.env).toStrictEqual(env);
  });

  it('should set proxy flag from the constructor', () => {
    const proxy = true;
    const app = new Koa({ proxy });
    expect(app.proxy).toStrictEqual(proxy);
  });

  it('should set signed cookie keys from the constructor', () => {
    const keys = ['customkey'];
    const app = new Koa({ keys });
    expect(app.keys).toStrictEqual(keys);
  });

  it('should set subdomainOffset from the constructor', () => {
    const subdomainOffset = 3;
    const app = new Koa({ subdomainOffset });
    expect(app.subdomainOffset).toStrictEqual(subdomainOffset);
  });

  it('should have a static property exporting `HttpError` from http-errors library', () => {
    const CreateError = require('http-errors');

    expect(Koa.HttpError).not.toBe(undefined);
    expect(Koa.HttpError).toStrictEqual(CreateError.HttpError);
    expect(() => { throw new CreateError(500, 'test error'); }).toThrow(Koa.HttpError);
  });
});
