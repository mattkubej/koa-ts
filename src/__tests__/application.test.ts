import Koa, { KoaError } from '../application';
import Response from '../response';
import Context from '../context';
import request from 'supertest';
import util from 'util';
import mm from 'mm';
import fs from 'fs';
import statuses from 'statuses';

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

  describe('app.context', () => {
  });

  describe('app.inspect()', () => {
    const app = new Koa();

    it('should work', () => {
      const str = util.inspect(app);
      expect("{ subdomainOffset: 2, proxy: false, env: 'test' }").toBe(str);
    });

    it('should return a json representation', () => {
      expect({ subdomainOffset: 2, proxy: false, env: 'test' }).toStrictEqual(app.inspect());
    });
  });

  describe('app.onerror(err)', () => {
    afterEach(mm.restore);

    it('should throw an error if a non-error is given', () => {
      const app = new Koa();

      expect(() => {
        app.onerror('foo');
      }).toThrow(new TypeError('non-error thrown: \"foo\"'));
    });

    it('should do nothing if status is 404', () => {
      const app = new Koa();
      const err = new KoaError();

      err.status = 404;

      let called = false;
      mm(console, 'error', () => { called = true; });
      app.onerror(err);
      expect(!called).toBeTruthy();
    });

    it('should do nothing if .silent', () => {
      const app = new Koa();
      app.silent = true;
      const err = new Error();

      let called = false;
      mm(console, 'error', () => { called = true; });
      app.onerror(err);
      expect(!called).toBeTruthy();
    });

    it('should log the error to stderr', () => {
      const app = new Koa();
      app.env = 'dev';

      const err = new Error();
      err.stack = 'Foo';

      let msg = '';
      mm(console, 'error', (input: string) => {
        if (input) msg = input;
      });
      app.onerror(err);
      expect(msg).toBe('  Foo');
    });

    it('should use err.toString() instad of err.stack', () => {
      const app = new Koa();
      app.env = 'dev';

      const err = new Error('mock stack null');
      err.stack = null;

      app.onerror(err);

      let msg = '';
      mm(console, 'error', (input: string) => {
        if (input) msg = input;
      });
      app.onerror(err);
      expect(msg).toBe('  Error: mock stack null');
    });
  });

  describe('app.request', () => {});

  describe('app.respond', () => {
    describe('when ctx.respond === false', () => {
      it('should function (ctx)', () => {
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

        return request(server)
        .get('/')
        .expect(200)
        .expect('lol');
      });

      it('should ignore set header after header sent', () => {
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

        return request(server)
        .get('/')
        .expect(200)
        .expect('lol')
        .expect(res => {
          expect(!res.header.foo).toBeTruthy();
        });
      });

      it('should ignore set status after header sent', () => {
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

        return request(server)
        .get('/')
        .expect(200)
        .expect('lol');
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

        const res = await request(server)
        .get('/')
        .expect(200);

        expect(res.header.hasOwnProperty('Content-Type')).toBeFalsy();
      });
    });

    describe('when HEAD is used', () => {
      it('should not respond with the body', async() => {
        const app = new Koa();

        app.use((ctx: Context) => {
          ctx.body = 'Hello';
        });

        const server = app.listen();

        const res = await request(server)
        .head('/')
        .expect(200);

        expect(res.header['content-type']).toBe('text/plain; charset=utf-8');
        expect(res.header['content-length']).toBe('5');
        expect(!res.text).toBeTruthy();
      });

      it('should keep json headers', async() => {
        const app = new Koa();

        app.use((ctx: Context) => {
          ctx.body = { hello: 'world' };
        });

        const server = app.listen();

        const res = await request(server)
        .head('/')
        .expect(200);

        expect(res.header['content-type']).toBe('application/json; charset=utf-8');
        expect(res.header['content-length']).toBe('17');
        expect(!res.text).toBeTruthy();
      });

      it('should keep string headers', async() => {
        const app = new Koa();

        app.use((ctx: Context) => {
          ctx.body = 'hello world';
        });

        const server = app.listen();

        const res = await request(server)
        .head('/')
        .expect(200);

        expect(res.header['content-type']).toBe('text/plain; charset=utf-8');
        expect(res.header['content-length']).toBe('11');
        expect(!res.text).toBeTruthy();
      });

      it('should keep buffer headers', async() => {
        const app = new Koa();

        app.use((ctx: Context) => {
          ctx.body = Buffer.from('hello world');
        });

        const server = app.listen();

        const res = await request(server)
        .head('/')
        .expect(200);

        expect(res.header['content-type']).toBe('application/octet-stream');
        expect(res.header['content-length']).toBe('11');
        expect(!res.text).toBeTruthy();
      });

      it('should keep stream header if set manually', async() => {
        const app = new Koa();

        const { length } = fs.readFileSync('package.json');

        app.use((ctx: Context) => {
          ctx.length = length;
          ctx.body = fs.createReadStream('package.json');
        });

        const server = app.listen();

        const res = await request(server)
        .head('/')
        .expect(200);

        expect(res.header['content-length']).toBe(length);
        expect(!res.text).toBeTruthy();
      });

      it('should respond with a 404 if no body was set', () => {
        const app = new Koa();

        app.use(() => {

        });

        const server = app.listen();

        return request(server)
        .head('/')
        .expect(404);
      });

      it('should respond with a 200 if body = ""', () => {
        const app = new Koa();

        app.use((ctx: Context) => {
          ctx.body = '';
        });

        const server = app.listen();

        return request(server)
        .head('/')
        .expect(200);
      });

      it('should not overwrite the content-type', () => {
        const app = new Koa();

        app.use((ctx: Context) => {
          ctx.status = 200;
          ctx.type = 'application/javascript';
        });

        const server = app.listen();

        return request(server)
        .head('/')
        .expect('content-type', /application\/javascript/)
        .expect(200);
      });
    });

    describe('when no middleware are present', () => {
      it('should 404', () => {
        const app = new Koa();

        const server = app.listen();

        return request(server)
        .get('/')
        .expect(404);
      });
    });

    describe('when res has already been written to', () => {
      it('should not cause an app error', () => {
        const app = new Koa();

        app.use((ctx: Context) => {
          const res = ctx.res;
          ctx.status = 200;
          res.setHeader('Content-Type', 'text/html');
          res.write('Hello');
        });

        app.on('error', err => { throw err; });

        const server = app.listen();

        return request(server)
        .get('/')
        .expect(200);
      });

      it('should send the right body', () => {
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

        return request(server)
        .get('/')
        .expect(200)
        .expect('HelloGoodbye');
      });
    });

    describe('when .body is missing', () => {
      describe('with status=400', () => {
        it('should respond with the associated status message', () => {
          const app = new Koa();

          app.use((ctx: Context) => {
            ctx.status = 400;
          });

          const server = app.listen();

          return request(server)
          .get('/')
          .expect(400)
          .expect('Content-Length', '11')
          .expect('Bad Request');
        });
      });

      describe('with status=204', () => {
        it('should respond without a body', async() => {
          const app = new Koa();

          app.use((ctx: Context) => {
            ctx.status = 204;
          });

          const server = app.listen();

          const res = await request(server)
          .get('/')
          .expect(204)
          .expect('');

          expect(res.header.hasOwnProperty('content-type')).toBeFalsy();
        });
      });

      describe('with status=205', () => {
        it('should respond without a body', async() => {
          const app = new Koa();

          app.use((ctx: Context) => {
            ctx.status = 205;
          });

          const server = app.listen();

          const res = await request(server)
          .get('/')
          .expect(205)
          .expect('');

          expect(res.header.hasOwnProperty('content-type')).toBeFalsy();
        });
      });

      describe('with status=304', () => {
        it('should respond without a body', async() => {
          const app = new Koa();

          app.use((ctx: Context) => {
            ctx.status = 304;
          });

          const server = app.listen();

          const res = await request(server)
          .get('/')
          .expect(304)
          .expect('');

          expect(res.header.hasOwnProperty('content-type')).toBeFalsy();
        });
      });

      describe('with custom status=418', () => {
        it('should respond with the associated status message', async() => {
          const app = new Koa();

          app.use((ctx: Context) => {
            ctx.status = 418;
          });

          const server = app.listen();

          const res = await request(server)
          .get('/')
          .expect(418)
          .expect(statuses.message[418]);

          expect(res.res.statusMessage).toBe(`I'm a Teapot`);
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

          const res = await request(server)
          .get('/')
          .expect(200)
          .expect('ok');

          expect(res.res.statusMessage).toBe('ok');
        });
      });

      describe('with custom status without message', () => {
        it('should respond with the status code number', () => {
          const app = new Koa();

          app.use((ctx: Context) => {
            ctx.res.statusCode = 701;
          });

          const server = app.listen();

          return request(server)
          .get('/')
          .expect(701)
          .expect('701');
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

        const res = await request(server)
        .get('/')
        .expect(204)
        .expect('');

        expect(res.header.hasOwnProperty('content-type')).toBeFalsy()
      });

      it('should respond 204 with status=200', async() => {
        const app = new Koa();

        app.use((ctx: Context) => {
          ctx.status = 200;
          ctx.body = null;
        });

        const server = app.listen();

        const res = await request(server)
        .get('/')
        .expect(204)
        .expect('');

        expect(res.header.hasOwnProperty('content-type')).toBeFalsy();
      });

      it('should respond 205 with status=205', async() => {
        const app = new Koa();

        app.use((ctx: Context) => {
          ctx.status = 205;
          ctx.body = null;
        });

        const server = app.listen();

        const res = await request(server)
        .get('/')
        .expect(205)
        .expect('');

        expect(res.header.hasOwnProperty('content-type')).toBeFalsy();
      });

      it('should respond 304 with status=304', async() => {
        const app = new Koa();

        app.use((ctx: Context) => {
          ctx.status = 304;
          ctx.body = null;
        });

        const server = app.listen();

        const res = await request(server)
        .get('/')
        .expect(304)
        .expect('');

        expect(res.header.hasOwnProperty('content-type')).toBeFalsy();
      });
    });

    describe('when .body is a string', () => {
      it('should respond', () => {
        const app = new Koa();

        app.use((ctx: Context) => {
          ctx.body = 'Hello';
        });

        const server = app.listen();

        return request(server)
        .get('/')
        .expect('Hello');
      });
    });

    describe('when .body is a Buffer', () => {
      it('should respond', () => {
        const app = new Koa();

        app.use((ctx: Context) => {
          ctx.body = Buffer.from('Hello');
        });

        const server = app.listen();

        return request(server)
        .get('/')
        .expect(200)
        .expect(Buffer.from('Hello'));
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

        const res = await request(server)
        .get('/')
        .expect('Content-Type', 'application/json; charset=utf-8');

        const pkg = require('../../package');
        expect(res.header.hasOwnProperty('content-length')).toBeFalsy();
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

        const res = await request(server)
        .get('/')
        .expect('Content-Type', 'application/json; charset=utf-8');

        const pkg = require('../../package');
        expect(res.header.hasOwnProperty('content-length')).toBeFalsy();
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

        const res = await request(server)
        .get('/')
        .expect('Content-Type', 'application/json; charset=utf-8');

        const pkg = require('../../package');
        expect(res.header.hasOwnProperty('content-length')).toBeTruthy();
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

           const res = await request(server)
           .get('/')
           .expect('Content-Type', 'application/json; charset=utf-8');

           const pkg = require('../../package');
           expect(res.header.hasOwnProperty('content-length')).toBeTruthy();
           expect(res.body).toStrictEqual(pkg);
         });

         it('should handle errors', done => {
           const app = new Koa();

           app.use((ctx: Context) => {
             ctx.set('Content-Type', 'application/json; charset=utf-8');
             ctx.body = fs.createReadStream('does not exist');
           });

           const server = app.listen();

           request(server)
           .get('/')
           .expect('Content-Type', 'text/plain; charset=utf-8')
           .expect(404)
           .end(done);
         });

         it('should handle errors when no content status', () => {
           const app = new Koa();

           app.use((ctx: Context) => {
             ctx.status = 204;
             ctx.body = fs.createReadStream('does not exist');
           });

           const server = app.listen();

           return request(server)
           .get('/')
           .expect(204);
         });

         it('should handle all intermediate stream body errors', done => {
           const app = new Koa();

           app.use((ctx: Context) => {
             ctx.body = fs.createReadStream('does not exist');
             ctx.body = fs.createReadStream('does not exist');
             ctx.body = fs.createReadStream('does not exist');
           });

           const server = app.listen();

           request(server)
           .get('/')
           .expect(404)
           .end(done);
         });
    });

    describe('when .body is an Object', () => {
      it('should respond with json', () => {
        const app = new Koa();

        app.use((ctx: Context) => {
          ctx.body = { hello: 'world' };
        });

        const server = app.listen();

        return request(server)
        .get('/')
        .expect('Content-Type', 'application/json; charset=utf-8')
        .expect('{"hello":"world"}');
      });
    });

    describe('when an error occurs', () => {
      it('should emit "error" on the app', done => {
        const app = new Koa();

        app.use(() => {
          throw new Error('boom');
        });

        app.on('error', err => {
          expect(err.message).toBe('boom');
          done();
        });

        request(app.callback())
        .get('/')
        .end(() => {});
      });

      describe('with an .expose property', () => {
        it('should expose the message', () => {
          const app = new Koa();

          app.use(() => {
            const err = new KoaError('sorry!');
            err.status = 403;
            err.expose = true;
            throw err;
          });

          return request(app.callback())
          .get('/')
          .expect(403, 'sorry!');
        });
      });

      describe('with a .status property', () => {
        it('should respond with .status', () => {
          const app = new Koa();

          app.use(() => {
            const err = new KoaError('s3 explodes');
            err.status = 403;
            throw err;
          });

          return request(app.callback())
          .get('/')
          .expect(403, 'Forbidden');
        });
      });

      it('should respond with 500', () => {
        const app = new Koa();

        app.use(() => {
          throw new Error('boom!');
        });

        const server = app.listen();

        return request(server)
        .get('/')
        .expect(500, 'Internal Server Error');
      });

      it('should be catchable', () => {
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

        return request(server)
        .get('/')
        .expect(200, 'Got error');
      });
    });

    describe('when status and body property', () => {
      it('should 200', () => {
        const app = new Koa();

        app.use((ctx: Context) => {
          ctx.status = 304;
          ctx.body = 'hello';
          ctx.status = 200;
        });

        const server = app.listen();

        return request(server)
        .get('/')
        .expect(200)
        .expect('hello');
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

        const res = await request(server)
        .get('/')
        .expect(204);

        expect(res.header.hasOwnProperty('content-type')).toBeFalsy();
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

        return request(server)
        .get('/')
        .expect(404)
        .expect('')
        .expect({});
      });

      it('should respond with correct headers', async() => {
        const app = new Koa();

        app.use((ctx: Context) => {
          ctx.body = null;
          ctx.status = 401;
        });

        const server = app.listen();

        const res = await request(server)
        .get('/')
        .expect(401)
        .expect('')
        .expect({});

        expect(res.header.hasOwnProperty('content-type')).toBeFalsy();
      });
    });
  });
});
