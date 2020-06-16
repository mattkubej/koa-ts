import context from '../helpers/context';

describe('ctx.assert(value, status)', () => {
  it('should throw an error', () => {
    expect(() => {
      const ctx = context();
      ctx.assert(false, 404);
      throw new Error('asdf');
    }).toThrow(
      expect.objectContaining({ status: 404, expose: true })
    );
  });
});
