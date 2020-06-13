import { response } from '../helpers/context';

describe('res.header', () => {
  it('should return the response header object', () => {
    const res = response();
    res.set('X-Foo', 'bar');
    expect(res.headers).toMatchObject({ 'x-foo': 'bar' });
  });

  describe('when res._headers not present', () => {
    it('should return empty object', () => {
      const res = response();
      (res.res as any)._headers = null;
      expect(res.headers).toMatchObject({});
    });
  });
});
