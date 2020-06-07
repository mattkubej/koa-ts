import Koa from '../../application';

describe('app.toJSON()', () => {
  it('should work', () => {
    const app = new Koa();
    const obj = app.toJSON();

    expect({
      subdomainOffset: 2,
      proxy: false,
      env: 'test'
    }).toStrictEqual(obj);
  });
});
