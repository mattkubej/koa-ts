import request from 'supertest';
import { response } from '../helpers/context';
import Koa from '../../application';
import Context from '../../context';
import http from 'http';

describe('res.header', () => {
  it('should return the response header object', () => {
    const res = response();
    res.set('X-Foo', 'bar');
    res.set('X-Number', 200);
    expect(res.header).toMatchObject({ 'x-foo': 'bar', 'x-number': 200 });
  });

  it('should use res.getHeaders() accessor when available', () => {
    const res = response();
    res.res._headers = null;
    res.res.getHeaders = () => ({ 'x-foo': 'baz' });
    expect(res.header).toMatchObject({ 'x-foo': 'baz' });
  });

  it('should return the response header object when no mocks are in use', async() => {
    const app = new Koa();
    let header: http.OutgoingHttpHeaders;

    app.use((ctx: Context) => {
      ctx.set('x-foo', '42');
      header = Object.assign({}, ctx.response.header);
    });

    await request(app.callback())
      .get('/');

    expect(header).toMatchObject({ 'x-foo': '42' });
  });

  describe('when res._headers not present', () => {
    it('should return empty object', () => {
      const res = response();
      res.res._headers = null;
      expect(res.header).toMatchObject({});
    });
  });
});
