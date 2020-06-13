import context from '../helpers/context';

describe('ctx.origin', () => {
  it('should return the origin of url', () => {
    const req = {
      url: '/users/1?next=/dashboard',
      headers: {
        host: 'localhost'
      }
    };
    const ctx = context(req);
    expect(ctx.origin).toBe('http://localhost');
    // change it also work
    ctx.url = '/foo/users/1?next=/dashboard';
    expect(ctx.origin).toBe('http://localhost');
  });
});
