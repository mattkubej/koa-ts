import Koa from '../../application';
import util from 'util';

describe('app.inspect()', () => {
  const app = new Koa();

  it('should work', () => {
    const str = util.inspect(app);
    expect("{ subdomainOffset: 2, proxy: false, env: 'test' }").toBe(str);
  });

  it('should return a json representation', () => {
    expect({ subdomainOffset: 2, proxy: false, env: 'test' }).toStrictEqual(app.inspect());
  });
});
