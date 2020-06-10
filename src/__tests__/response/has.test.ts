import context from '../helpers/context';

describe('ctx.response.has(name)', () => {
  it('should check a field value, case insensitive way', () => {
    const ctx = context();
    ctx.set('X-Foo', '');
    expect(ctx.response.has('x-Foo')).toBeTruthy();
    expect(ctx.has('x-foo')).toBeTruthy();
  });

  it('should return false for non-existent header', () => {
    const ctx = context();
    expect(ctx.response.has('boo')).toBeFalsy();
    ctx.set('x-foo', 5);
    expect(ctx.has('x-boo')).toBeFalsy();
  });
});
