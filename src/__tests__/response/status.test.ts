import { response } from '../helpers/context';
import request from 'supertest';
import Koa from '../../application';
import Context from '../../context';

describe('res.status=', () => {
  describe('when a status code', () => {
    describe('and valid', () => {
      it('should set the status', () => {
        const res = response();
        res.status = 403;
        expect(res.status).toBe(403);
      });

      it('should not throw', () => {
        response().status = 403;
      });
    });

    describe('and invalid', () => {
      it('should throw', () => {
        expect(() => {
          response().status = 99;
        }).toThrow(/invalid status code: 99/);
      });
    });

    describe('and custom status', () => {
      it('should set the status', () => {
        const res = response();
        res.status = 700;
        expect(res.status).toBe(700);
      });

      it('should not throw', () => {
        response().status = 700;
      });
    });

    describe('and HTTP/2', () => {
      it('should not set the status message', () => {
        const res = response({
          'httpVersionMajor': 2,
          'httpVersion': '2.0'
        });
        res.status = 200;
        expect(res.res.statusMessage).toBeUndefined();
      });
    });
  });

  describe('when a status string', () => {
    it('should throw', () => {
      expect(() => response().status = 'forbidden').toThrow(/status code must be a number/);
    });
  });

  function strip(status: number){
    it('should strip content related header fields', async() => {
      const app = new Koa();

      app.use((ctx: Context) => {
        ctx.body = { foo: 'bar' };
        ctx.set('Content-Type', 'application/json; charset=utf-8');
        ctx.set('Content-Length', '15');
        ctx.set('Transfer-Encoding', 'chunked');
        ctx.status = status;
        expect(ctx.response.header['content-type']).toBeUndefined();
        expect(ctx.response.header['content-length']).toBeUndefined();
        expect(ctx.response.header['transfer-encoding']).toBeUndefined();
      });

      const res = await request(app.callback())
        .get('/')
        .expect(status);

      expect(res.headers.hasOwnProperty('content-type')).toBeFalsy();
      expect(res.headers.hasOwnProperty('content-length')).toBeFalsy();
      expect(res.headers.hasOwnProperty('content-encoding')).toBeFalsy();
      expect(res.text.length).toBe(0);
    });

    it('should strip content releated header fields after status set', async() => {
      const app = new Koa();

      app.use((ctx: Context) => {
        ctx.status = status;
        ctx.body = { foo: 'bar' };
        ctx.set('Content-Type', 'application/json; charset=utf-8');
        ctx.set('Content-Length', '15');
        ctx.set('Transfer-Encoding', 'chunked');
      });

      const res = await request(app.callback())
        .get('/')
        .expect(status);

      expect(res.headers.hasOwnProperty('content-type')).toBeFalsy();
      expect(res.headers.hasOwnProperty('content-length')).toBeFalsy();
      expect(res.headers.hasOwnProperty('content-encoding')).toBeFalsy();
      expect(res.text.length).toBe(0);
    });
  }

  describe('when 204', () => strip(204));

  describe('when 205', () => strip(205));

  describe('when 304', () => strip(304));
});
