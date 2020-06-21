import Koa, { KoaError } from '../../application';
import Context from '../../context';
import request from 'supertest';
import fs from 'fs';
import statuses from 'statuses';

// silence console.error during tests
jest.spyOn(global.console, 'error').mockImplementation(() => {});

describe('app.respond', () => {
  describe('when ctx.respond === false', () => {
    it('should function (ctx)', async() => {
      const app = new Koa();

      app.use((ctx: Context) => {
        ctx.body = 'Hello';
        ctx.respond = false;

        const res = ctx.res;
        res.statusCode = 200;
        setImmediate(() => {
          res.setHeader('Content-Type', 'text/plain');
          res.setHeader('Content-Length', '3');
          res.end('lol');
        });
      });

      const server = app.listen();

      const response = await request(server).get('/');
      server.close();
      expect(response.status).toBe(200);
      expect(response.text).toBe('lol');
    });

    it('should ignore set header after header sent', async() => {
      const app = new Koa();
      app.use((ctx: Context) => {
        ctx.body = 'Hello';
        ctx.respond = false;

        const res = ctx.res;
        res.statusCode = 200;
        res.setHeader('Content-Type', 'text/plain');
        res.setHeader('Content-Length', '3');
        res.end('lol');
        ctx.set('foo', 'bar');
      });

      const server = app.listen();

      const response = await request(server).get('/');
      server.close();
      expect(response.status).toBe(200);
      expect(response.text).toBe('lol');
      expect(response.headers.foo).toBeUndefined();
    });

    it('should ignore set status after header sent', async() => {
      const app = new Koa();
      app.use((ctx: Context) => {
        ctx.body = 'Hello';
        ctx.respond = false;

        const res = ctx.res;
        res.statusCode = 200;
        res.setHeader('Content-Type', 'text/plain');
        res.setHeader('Content-Length', '3');
        res.end('lol');
        ctx.status = 201;
      });

      const server = app.listen();

      const response = await request(server).get('/');
      server.close();
      expect(response.status).toBe(200);
      expect(response.text).toBe('lol');
    });
  });

  describe('when this.type === null', () => {
    it('should not send Content-Type header', async() => {
      const app = new Koa();

      app.use((ctx: Context) => {
        ctx.body = '';
        ctx.type = null;
      });

      const server = app.listen();

      const res = await request(server).get('/');
      server.close();
      expect(res.status).toBe(200);
      expect(Object.prototype.hasOwnProperty.call(res.headers, 'Content-Type')).toBeFalsy();
    });
  });

  describe('when HEAD is used', () => {
    it('should not respond with the body', async() => {
      const app = new Koa();

      app.use((ctx: Context) => {
        ctx.body = 'Hello';
      });

      const server = app.listen();

      const res = await request(server).head('/');
      server.close();
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toBe('text/plain; charset=utf-8');
      expect(res.headers['content-length']).toBe('5');
      expect(res.text).toBeUndefined();
    });

    it('should keep json headers', async() => {
      const app = new Koa();

      app.use((ctx: Context) => {
        ctx.body = { hello: 'world' };
      });

      const server = app.listen();

      const res = await request(server).head('/');
      server.close();
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toBe('application/json; charset=utf-8');
      expect(res.headers['content-length']).toBe('17');
      expect(res.text).toBeUndefined();
    });

    it('should keep string headers', async() => {
      const app = new Koa();

      app.use((ctx: Context) => {
        ctx.body = 'hello world';
      });

      const server = app.listen();

      const res = await request(server).head('/');
      server.close();
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toBe('text/plain; charset=utf-8');
      expect(res.headers['content-length']).toBe('11');
      expect(res.text).toBeUndefined();
    });

    it('should keep buffer headers', async() => {
      const app = new Koa();

      app.use((ctx: Context) => {
        ctx.body = Buffer.from('hello world');
      });

      const server = app.listen();

      const res = await request(server).head('/');
      server.close();
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toBe('application/octet-stream');
      expect(res.headers['content-length']).toBe('11');
      expect(res.text).toBeUndefined();
    });

    it('should keep stream header if set manually', async() => {
      const app = new Koa();

      const { length } = fs.readFileSync('package.json');

      app.use((ctx: Context) => {
        ctx.length = length;
        ctx.body = fs.createReadStream('package.json');
      });

      const server = app.listen();

      const res = await request(server).head('/');
      server.close();
      expect(res.status).toBe(200);
      expect(res.header['content-length']).toBe(String(length));
      expect(res.text).toBeUndefined();
    });

    it('should respond with a 404 if no body was set', async() => {
      const app = new Koa();

      app.use(() => {});

      const server = app.listen();

      const response = await request(server).head('/');
      server.close();
      expect(response.status).toBe(404);
    });

    it('should respond with a 200 if body = ""', async() => {
      const app = new Koa();

      app.use((ctx: Context) => {
        ctx.body = '';
      });

      const server = app.listen();

      const response = await request(server).head('/');
      server.close();
      expect(response.status).toBe(200);
    });

    it('should not overwrite the content-type', async() => {
      const app = new Koa();

      app.use((ctx: Context) => {
        ctx.status = 200;
        ctx.type = 'application/javascript';
      });

      const server = app.listen();

      const response = await request(server).head('/');
      server.close();
      expect(response.headers['content-type']).toBe('application/javascript; charset=utf-8');
      expect(response.status).toBe(200);
    });
  });

  describe('when no middleware are present', () => {
    it('should 404', async() => {
      const app = new Koa();

      const server = app.listen();

      const response = await request(server).get('/');
      server.close();
      expect(response.status).toBe(404);
    });
  });

  describe('when res has already been written to', () => {
    it('should not cause an app error', async() => {
      const app = new Koa();

      app.use((ctx: Context) => {
        const res = ctx.res;
        ctx.status = 200;
        res.setHeader('Content-Type', 'text/html');
        res.write('Hello');
      });

      app.on('error', err => { throw err; });

      const server = app.listen();

      const response = await request(server).get('/');
      server.close();
      expect(response.status).toBe(200);
    });

    it('should send the right body', async() => {
      const app = new Koa();

      app.use((ctx: Context) => {
        const res = ctx.res;
        ctx.status = 200;
        res.setHeader('Content-Type', 'text/html');
        res.write('Hello');
        return new Promise(resolve => {
          setTimeout(() => {
            res.end('Goodbye');
            resolve();
          }, 0);
        });
      });

      const server = app.listen();

      const response = await request(server).get('/');
      server.close();
      expect(response.status).toBe(200);
      expect(response.text).toBe('HelloGoodbye');
    });
  });

  describe('when .body is missing', () => {
    describe('with status=400', () => {
      it('should respond with the associated status message', async() => {
        const app = new Koa();

        app.use((ctx: Context) => {
          ctx.status = 400;
        });

        const server = app.listen();

        const response = await request(server).get('/');
        server.close();
        expect(response.status).toBe(400);
        expect(response.headers['content-length']).toBe('11');
        expect(response.text).toBe('Bad Request');
      });
    });

    describe('with status=204', () => {
      it('should respond without a body', async() => {
        const app = new Koa();

        app.use((ctx: Context) => {
          ctx.status = 204;
        });

        const server = app.listen();

        const res = await request(server).get('/');
        server.close();
        expect(res.status).toBe(204);
        expect(res.text).toBe('');
        expect(Object.prototype.hasOwnProperty.call(res.headers, 'content-type')).toBeFalsy();
      });
    });

    describe('with status=205', () => {
      it('should respond without a body', async() => {
        const app = new Koa();

        app.use((ctx: Context) => {
          ctx.status = 205;
        });

        const server = app.listen();

        const res = await request(server).get('/');
        server.close();
        expect(res.status).toBe(205);
        expect(res.text).toBe('');
        expect(Object.prototype.hasOwnProperty.call(res.headers, 'content-type')).toBeFalsy();
      });
    });

    describe('with status=304', () => {
      it('should respond without a body', async() => {
        const app = new Koa();

        app.use((ctx: Context) => {
          ctx.status = 304;
        });

        const server = app.listen();

        const res = await request(server).get('/');
        server.close();
        expect(res.status).toBe(304);
        expect(res.text).toBe('');
        expect(Object.prototype.hasOwnProperty.call(res.headers, 'content-type')).toBeFalsy();
      });
    });

    describe('with custom status=700', () => {
      it('should respond with the associated status message', async() => {
        const app = new Koa();
        statuses.message[700] = 'custom status';

        app.use((ctx: Context) => {
          ctx.status = 700;
        });

        const server = app.listen();

        const res = await request(server).get('/');
        server.close();
        expect(res.status).toBe(700);
        expect(res.text).toBe('custom status');
        expect(res.res.statusMessage).toBe('custom status');
      });
    });

    describe('with custom statusMessage=ok', () => {
      it('should respond with the custom status message', async() => {
        const app = new Koa();

        app.use((ctx: Context) => {
          ctx.status = 200;
          ctx.message = 'ok';
        });

        const server = app.listen();

        const res = await request(server).get('/');
        server.close();
        expect(res.status).toBe(200);
        expect(res.text).toBe('ok');
        expect(res.res.statusMessage).toBe('ok');
      });
    });

    describe('with custom status without message', () => {
      it('should respond with the status code number', async() => {
        const app = new Koa();

        app.use((ctx: Context) => {
          ctx.res.statusCode = 701;
        });

        const server = app.listen();

        const response = await request(server).get('/');
        server.close();
        expect(response.status).toBe(701);
        expect(response.text).toBe('701');
      });
    });
  });

  describe('when .body is a null', () => {
    it('should respond 204 by default', async() => {
      const app = new Koa();

      app.use((ctx: Context) => {
        ctx.body = null;
      });

      const server = app.listen();

      const res = await request(server).get('/');
      server.close();
      expect(res.status).toBe(204);
      expect(res.text).toBe('');
      expect(Object.prototype.hasOwnProperty.call(res.headers, 'content-type')).toBeFalsy();
    });

    it('should respond 204 with status=200', async() => {
      const app = new Koa();

      app.use((ctx: Context) => {
        ctx.status = 200;
        ctx.body = null;
      });

      const server = app.listen();

      const res = await request(server).get('/');
      server.close();
      expect(res.status).toBe(204);
      expect(res.text).toBe('');
      expect(Object.prototype.hasOwnProperty.call(res.headers, 'content-type')).toBeFalsy();
    });

    it('should respond 205 with status=205', async() => {
      const app = new Koa();

      app.use((ctx: Context) => {
        ctx.status = 205;
        ctx.body = null;
      });

      const server = app.listen();

      const res = await request(server).get('/');
      server.close();
      expect(res.status).toBe(205);
      expect(res.text).toBe('');
      expect(Object.prototype.hasOwnProperty.call(res.headers, 'content-type')).toBeFalsy();
    });

    it('should respond 304 with status=304', async() => {
      const app = new Koa();

      app.use((ctx: Context) => {
        ctx.status = 304;
        ctx.body = null;
      });

      const server = app.listen();

      const res = await request(server).get('/');
      server.close();
      expect(res.status).toBe(304);
      expect(res.text).toBe('');
      expect(Object.prototype.hasOwnProperty.call(res.headers, 'content-type')).toBeFalsy();
    });
  });

  describe('when .body is a string', () => {
    it('should respond', async() => {
      const app = new Koa();

      app.use((ctx: Context) => {
        ctx.body = 'Hello';
      });

      const server = app.listen();

      const response = await request(server).get('/');
      server.close();
      expect(response.text).toBe('Hello');
    });
  });

  describe('when .body is a Buffer', () => {
    it('should respond', async() => {
      const app = new Koa();

      app.use((ctx: Context) => {
        ctx.body = Buffer.from('Hello');
      });

      const server = app.listen();

      const response = await request(server).get('/');
      server.close();
      expect(response.status).toBe(200);
      expect(response.body).toMatchObject(Buffer.from([72, 101, 108, 108, 111]));
    });
  });

  describe('when .body is a Stream', () => {
    it('should respond', async() => {
      const app = new Koa();

      app.use((ctx: Context) => {
        ctx.body = fs.createReadStream('package.json');
        ctx.set('Content-Type', 'application/json; charset=utf-8');
      });

      const server = app.listen();

      const res = await request(server).get('/');
      server.close();
      expect(res.headers['content-type']).toBe('application/json; charset=utf-8');
      const pkg = require('../../../package');
      expect(Object.prototype.hasOwnProperty.call(res.headers, 'content-length')).toBeFalsy();
      expect(res.body).toStrictEqual(pkg);
    });

    it('should strip content-length when overwriting', async() => {
      const app = new Koa();

      app.use((ctx: Context) => {
        ctx.body = 'hello';
        ctx.body = fs.createReadStream('package.json');
        ctx.set('Content-Type', 'application/json; charset=utf-8');
      });

      const server = app.listen();

      const res = await request(server).get('/');
      server.close();
      expect(res.headers['content-type']).toBe('application/json; charset=utf-8');
      const pkg = require('../../../package');
      expect(Object.prototype.hasOwnProperty.call(res.headers, 'content-length')).toBeFalsy();
      expect(res.body).toStrictEqual(pkg);
    });

    it('should keep content-length if not overwritten', async() => {
      const app = new Koa();

      app.use((ctx: Context) => {
        ctx.length = fs.readFileSync('package.json').length;
        ctx.body = fs.createReadStream('package.json');
        ctx.set('Content-Type', 'application/json; charset=utf-8');
      });

      const server = app.listen();

      const res = await request(server).get('/');
      server.close();
      expect(res.headers['content-type']).toBe('application/json; charset=utf-8');
      const pkg = require('../../../package');
      expect(Object.prototype.hasOwnProperty.call(res.headers, 'content-length')).toBeTruthy();
      expect(res.body).toStrictEqual(pkg);
    });

    it('should keep content-length if overwritten with the same stream',
      async() => {
        const app = new Koa();

        app.use((ctx: Context) => {
          ctx.length = fs.readFileSync('package.json').length;
          const stream = fs.createReadStream('package.json');
          ctx.body = stream;
          ctx.body = stream;
          ctx.set('Content-Type', 'application/json; charset=utf-8');
        });

        const server = app.listen();

        const res = await request(server).get('/');
        server.close();
        expect(res.headers['content-type']).toBe('application/json; charset=utf-8');
        const pkg = require('../../../package');
        expect(Object.prototype.hasOwnProperty.call(res.headers, 'content-length')).toBeTruthy();
        expect(res.body).toStrictEqual(pkg);
      });

    it('should handle errors', async() => {
      const app = new Koa();
      app.use((ctx: Context) => {
        ctx.set('Content-Type', 'application/json; charset=utf-8');
        ctx.body = fs.createReadStream('does not exist');
      });

      const server = app.listen();

      const response = await request(server).get('/');
      server.close();
      expect(response.headers['content-type']).toBe('text/plain; charset=utf-8');
      expect(response.status).toBe(404);
    });

    it('should handle errors when no content status', async() => {
      const app = new Koa();

      app.use((ctx: Context) => {
        ctx.status = 204;
        ctx.body = fs.createReadStream('does not exist');
      });

      const server = app.listen();

      const response = await request(server).get('/');
      server.close();
      expect(response.status).toBe(204);
    });

    it('should handle all intermediate stream body errors', async() => {
      const app = new Koa();

      app.use((ctx: Context) => {
        ctx.body = fs.createReadStream('does not exist');
        ctx.body = fs.createReadStream('does not exist');
        ctx.body = fs.createReadStream('does not exist');
      });

      const server = app.listen();

      const response = await request(server).get('/');
      server.close();
      expect(response.status).toBe(404);
    });
  });

  describe('when .body is an Object', () => {
    it('should respond with json', async() => {
      const app = new Koa();

      app.use((ctx: Context) => {
        ctx.body = { hello: 'world' };
      });

      const server = app.listen();

      const response = await request(server).get('/');
      server.close();
      expect(response.headers['content-type']).toBe('application/json; charset=utf-8');
      expect(response.body).toMatchObject({ hello: 'world' });
    });
  });

  describe('when an error occurs', () => {
    it('should emit "error" on the app', () => {
      return new Promise(resolve => {
        const app = new Koa();

        app.use(() => {
          throw new Error('boom');
        });

        app.on('error', err => {
          expect(err.message).toBe('boom');
          resolve();
        });

        request(app.callback())
          .get('/')
          .end(() => {});
      });
    });

    describe('with an .expose property', () => {
      it('should expose the message', async() => {
        const app = new Koa();

        app.use(() => {
          const err = new KoaError('sorry!');
          err.status = 403;
          err.expose = true;
          throw err;
        });

        const response = await request(app.callback()).get('/');
        expect(response.status).toBe(403);
        expect(response.text).toBe('sorry!');
      });
    });

    describe('with a .status property', () => {
      it('should respond with .status', async() => {
        const app = new Koa();

        app.use(() => {
          const err = new KoaError('s3 explodes');
          err.status = 403;
          throw err;
        });

        const response = await request(app.callback()).get('/');
        expect(response.status).toBe(403);
        expect(response.text).toBe('Forbidden');
      });
    });

    it('should respond with 500', async() => {
      const app = new Koa();

      app.use(() => {
        throw new Error('boom!');
      });

      const server = app.listen();

      const response = await request(server).get('/');
      server.close();
      expect(response.status).toBe(500);
      expect(response.text).toBe('Internal Server Error');
    });

    it('should be catchable', async() => {
      const app = new Koa();

      app.use((ctx: Context, next: Function) => {
        return next().then(() => {
          ctx.body = 'Hello';
        }).catch(() => {
          ctx.body = 'Got error';
        });
      });

      app.use(() => {
        throw new Error('boom!');
      });

      const server = app.listen();

      const response = await request(server).get('/');
      server.close();
      expect(response.status).toBe(200);
      expect(response.text).toBe('Got error');
    });
  });

  describe('when status and body property', () => {
    it('should 200', async() => {
      const app = new Koa();

      app.use((ctx: Context) => {
        ctx.status = 304;
        ctx.body = 'hello';
        ctx.status = 200;
      });

      const server = app.listen();

      const response = await request(server).get('/');
      server.close();
      expect(response.status).toBe(200);
      expect(response.text).toBe('hello');
    });

    it('should 204', async() => {
      const app = new Koa();

      app.use((ctx: Context) => {
        ctx.status = 200;
        ctx.body = 'hello';
        ctx.set('content-type', 'text/plain; charset=utf8');
        ctx.status = 204;
      });

      const server = app.listen();

      const res = await request(server).get('/');
      server.close();
      expect(res.status).toBe(204);
      expect(Object.prototype.hasOwnProperty.call(res.headers, 'content-type')).toBeFalsy();
    });
  });

  describe('with explicit null body', () => {
    it('should preserve given status', async() => {
      const app = new Koa();

      app.use((ctx: Context) => {
        ctx.body = null;
        ctx.status = 404;
      });

      const server = app.listen();

      const response = await request(server).get('/');
      server.close();
      expect(response.status).toBe(404);
      expect(response.text).toBe('');
      expect(response.body).toMatchObject({});
    });
    it('should respond with correct headers', async() => {
      const app = new Koa();

      app.use((ctx: Context) => {
        ctx.body = null;
        ctx.status = 401;
      });

      const server = app.listen();

      const res = await request(server).get('/');
      server.close();
      expect(res.status).toBe(401);
      expect(res.text).toBe('');
      expect(res.body).toStrictEqual({});
      expect(Object.prototype.hasOwnProperty.call(res.headers, 'content-type')).toBeFalsy();
    });
  });
});
