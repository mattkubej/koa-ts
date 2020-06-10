import { request } from '../helpers/context';

describe('req.type', () => {
  it('should return type void of parameters', () => {
    const req = request();
    req.header['content-type'] = 'text/html; charset=utf-8';
    expect(req.type).toBe('text/html');
  });

  it('with no host present', () => {
    const req = request();
    expect(req.type).toBe('');
  });
});
