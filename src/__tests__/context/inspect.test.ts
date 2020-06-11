import context from '../helpers/context';

describe('ctx.inspect()', () => {
  it('should return a json representation', () => {
    const ctx = context();
    const toJSON = ctx.toJSON(ctx);

    expect(toJSON).toMatchObject(ctx.inspect());

    // Note: is this valid anymore?
    //expect(util.inspect(toJSON)).toMatchObject(util.inspect(ctx));
  });

  // Note: is this valid a test anymore?
  // console.log(require.cache) will call prototype.inspect()
  //it('should not crash when called on the prototype', () => {
    //expect(Context).toMatchObject(Context.prototype.inspect());
    //expect(util.inspect(Context.prototype.inspect())).toMatchObject(util.inspect(Context));
  //});
});
