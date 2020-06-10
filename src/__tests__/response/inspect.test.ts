import { response } from '../helpers/context';

describe('res.inspect()', () => {
  describe('with no response.res present', () => {
    it('should return null', () => {
      const res = response();
      res.body = 'hello';
      delete res.res;
      expect(res.inspect()).toBeUndefined();

      // Note: should this be true?
      //expect(util.inspect(res)).toBe('undefined');
    });
  });

  it('should return a json representation', () => {
    const res = response();
    res.body = 'hello';

    const expected = {
      status: 200,
      message: 'OK',
      header: {
        'content-type': 'text/plain; charset=utf-8',
        'content-length': 5
      },
      body: 'hello'
    };

    expect(res.inspect()).toMatchObject(expected);

    // Note: should this be true?
    //expect(util.inspect(res)).toMatchObject(util.inspect(expected));
  });
});
