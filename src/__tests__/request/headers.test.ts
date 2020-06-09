import { request } from '../helpers/context';

describe('req.headers', () => {
  it('should return the request header object', () => {
    const req = request();
    expect(req.headers).toStrictEqual(req.req.headers);
  });

  it('should set the request header object', () => {
    const req = request();
    req.headers = {'X-Custom-Headerfield': 'Its one header, with headerfields'};
    expect(req.headers).toStrictEqual(req.req.headers);
  });
});
