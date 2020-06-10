import context from '../helpers/context';

describe('ctx.remove(name)', () => {
  it('should remove a field', () => {
    const ctx = context();
    ctx.set('x-foo', 'bar');
    ctx.remove('x-foo');
    expect(ctx.response.header).toMatchObject({});
  });
});
