import { request } from '../helpers/context';

describe('req.header', () => {
  it('should return the request header object', () => {
    const req = request();
    expect(req.header).toStrictEqual(req.req.headers);
  });

  it('should set the request header object', () => {
    const req = request();
    req.header = { 'X-Custom-Headerfield': 'Its one header, with headerfields' };
    expect(req.header).toStrictEqual(req.req.headers);
  });
});
