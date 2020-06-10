import { request } from '../helpers/context';
import util from 'util';

describe('req.inspect()', () => {
  describe('with no request.req present', () => {
    it('should return null', () => {
      const req = request();
      req.method = 'GET';
      delete req.req;
      expect(req.inspect()).toBeUndefined();

      // NOTE: should this really be the case?
      //expect(util.inspect(req)).toBe('undefined');
    });
  });

  it('should return a json representation', () => {
    const req = request();
    req.method = 'GET';
    req.url = 'example.com';
    req.header.host = 'example.com';

    const expected = {
      method: 'GET',
      url: 'example.com',
      header: {
        host: 'example.com'
      }
    };

    expect(req.inspect()).toMatchObject(expected);

    // NOTE: should this really be the case?
    //expect(util.inspect(req)).toMatchObject(util.inspect(expected));
  });
});
