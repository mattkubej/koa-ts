import Accept from 'accepts';
import context from '../helpers/context';

describe('ctx.accept', () => {
  it('should return an Accept instance', () => {
    const ctx = context();
    ctx.req.headers.accept = 'application/*;q=0.2, image/jpeg;q=0.8, text/html, text/plain';
    expect(ctx.accept instanceof Accept).toBeTruthy();
  });
});

describe('ctx.accept=', () => {
  it('should replace the accept object', () => {
    const ctx = context();
    ctx.req.headers.accept = 'text/plain';
    expect(ctx.accepts()).toStrictEqual(['text/plain']);

    ctx.request.req.headers.accept = 'application/*;q=0.2, image/jpeg;q=0.8, text/html, text/plain';
    ctx.accept = Accept(ctx.request.req);
    expect(ctx.accepts()).toStrictEqual(['text/html', 'text/plain', 'image/jpeg', 'application/*']);
  });
});
