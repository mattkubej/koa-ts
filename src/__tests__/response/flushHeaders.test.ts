import request from 'supertest';
import Koa from '../../application';
import Context from '../../context';
import http from 'http';

describe('ctx.flushHeaders()', () => {
  it('should set headersSent', () => {
    const app = new Koa();

    app.use((ctx: Context) => {
      ctx.body = 'Body';
      ctx.status = 200;
      ctx.flushHeaders();
      expect(ctx.res.headersSent).toBeTruthy();
    });

    const server = app.listen();

    return request(server)
      .get('/')
      .expect(200)
      .expect('Body');
  });

  it('should allow a response afterwards', async() => {
    const app = new Koa();

    app.use((ctx: Context) => {
      ctx.status = 200;
      ctx.res.setHeader('Content-Type', 'text/plain');
      ctx.flushHeaders();
      ctx.body = 'Body';
    });

    const server = app.listen();
    const response = await request(server).get('/');
    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toBe('text/plain');
    expect(response.text).toBe('Body');
  });

  it('should send the correct status code', async() => {
    const app = new Koa();

    app.use((ctx: Context) => {
      ctx.status = 401;
      ctx.res.setHeader('Content-Type', 'text/plain');
      ctx.flushHeaders();
      ctx.body = 'Body';
    });

    const server = app.listen();
    const response = await request(server).get('/');
    expect(response.status).toBe(401);
    expect(response.headers['content-type']).toBe('text/plain');
    expect(response.text).toBe('Body');
  });

  it('should ignore set header after flushHeaders', async() => {
    const app = new Koa();

    app.use((ctx: Context) => {
      ctx.status = 401;
      ctx.res.setHeader('Content-Type', 'text/plain');
      ctx.flushHeaders();
      ctx.body = 'foo';
      ctx.set('X-Shouldnt-Work', 'Value');
      ctx.remove('Content-Type');
      ctx.vary('Content-Type');
    });

    const server = app.listen();
    const res = await request(server)
      .get('/')
      .expect(401)
      .expect('Content-Type', 'text/plain');

    expect(res.headers['x-shouldnt-work']).toBeUndefined();
    expect(res.headers.vary).toBeUndefined();
  });

  it('should flush headers first and delay to send data', () => {
    return expect(new Promise(resolve => {
      const PassThrough = require('stream').PassThrough;
      const app = new Koa();

      app.use((ctx: Context) => {
        ctx.type = 'json';
        ctx.status = 200;
        ctx.headers.Link = '</css/mycss.css>; as=style; rel=preload, <https://img.craftflair.com>; rel=preconnect; crossorigin';
        const stream = ctx.body = new PassThrough();
        ctx.flushHeaders();

        setTimeout(() => {
          stream.end(JSON.stringify({ message: 'hello!' }));
        }, 10000);
      });

      app.listen(function(err: Error) {
        if (err) return resolve(err);

        const port = this.address().port;

        http.request({
          port
        })
          .on('response', res => {
            const onData = () => resolve(new Error('boom'));
            res.on('data', onData);

            // shouldn't receive any data for a while
            setTimeout(() => {
              res.removeListener('data', onData);
              resolve('pass');
            }, 1000);
          })
          .on('error', resolve)
          .end();
      });
    })).resolves.toBe('pass');
  });

  it('should catch stream error', () => {
    return new Promise(done => {
      const PassThrough = require('stream').PassThrough;
      const app = new Koa();
      app.once('error', err => {
        expect(err.message).toBe('mock error');
        done();
      });

      app.use((ctx: Context) => {
        ctx.type = 'json';
        ctx.status = 200;
        ctx.headers.Link = '</css/mycss.css>; as=style; rel=preload, <https://img.craftflair.com>; rel=preconnect; crossorigin';
        ctx.length = 20;
        ctx.flushHeaders();
        const stream = ctx.body = new PassThrough();

        setTimeout(() => {
          stream.emit('error', new Error('mock error'));
        }, 100);
      });

      const server = app.listen();

      request(server).get('/').end();
    });
  });
});
