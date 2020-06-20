import { response } from '../helpers/context';

describe('res.header', () => {
  it('should return the response header object', () => {
    const res = response();
    res.set('X-Foo', 'bar');
    expect(res.headers).toMatchObject({ 'x-foo': 'bar' });
  });
});
