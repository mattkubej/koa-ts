import context from '../helpers/context';

describe('ctx.inspect()', () => {
  it('should return a json representation', () => {
    const ctx = context();
    const toJSON = ctx.toJSON();

    expect(toJSON).toMatchObject(ctx.inspect());
  });
});
