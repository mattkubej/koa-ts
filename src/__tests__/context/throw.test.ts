import context from '../helpers/context';
import { KoaError } from '../../application';

describe('ctx.throw(msg)', () => {
  it('should set .status to 500', () => {
    const ctx = context();

    try {
      ctx.throw('boom');
    } catch (err) {
      expect(err.status).toBe(500);
      expect(err.expose).toBeFalsy();
    }
  });
});

describe('ctx.throw(err)', () => {
  it('should set .status to 500', () => {
    const ctx = context();
    const err = new Error('test');

    try {
      ctx.throw(err);
    } catch (err) {
      expect(err.status).toBe(500);
      expect(err.message).toBe('test');
      expect(err.expose).toBeFalsy();
    }
  });
});

describe('ctx.throw(err, status)', () => {
  it('should throw the error and set .status', () => {
    const ctx = context();
    const error = new Error('test');

    try {
      ctx.throw(error, 422);
    } catch (err) {
      expect(err.status).toBe(422);
      expect(err.message).toBe('test');
      expect(err.expose).toBeTruthy();
    }
  });
});

describe('ctx.throw(status, err)', () => {
  it('should throw the error and set .status', () => {
    const ctx = context();
    const error = new Error('test');

    try {
      ctx.throw(422, error);
    } catch (err) {
      expect(err.status).toBe(422);
      expect(err.message).toBe('test');
      expect(err.expose).toBeTruthy();
    }
  });
});

describe('ctx.throw(msg, status)', () => {
  it('should throw an error', () => {
    const ctx = context();

    try {
      ctx.throw('name required', 400);
    } catch (err) {
      expect(err.message).toBe('name required');
      expect(err.status).toBe(400);
      expect(err.expose).toBeTruthy();
    }
  });
});

describe('ctx.throw(status, msg)', () => {
  it('should throw an error', () => {
    const ctx = context();

    try {
      ctx.throw(400, 'name required');
    } catch (err) {
      expect(err.message).toBe('name required');
      expect(400).toBe(err.status);
      expect(err.expose).toBeTruthy();
    }
  });
});

describe('ctx.throw(status)', () => {
  it('should throw an error', () => {
    const ctx = context();

    try {
      ctx.throw(400);
    } catch (err) {
      expect(err.message).toBe('Bad Request');
      expect(err.status).toBe(400);
      expect(err.expose).toBeTruthy();
    }
  });

  describe('when not valid status', () => {
    it('should not expose', () => {
      const ctx = context();

      try {
        const err = new KoaError('some error');
        err.status = -1;
        ctx.throw(err);
      } catch (err) {
        expect(err.message).toBe('some error');
        expect(err.expose).toBeFalsy();
      }
    });
  });
});

describe('ctx.throw(status, msg, props)', () => {
  it('should mixin props', () => {
    const ctx = context();

    try {
      ctx.throw(400, 'msg', { prop: true });
    } catch (err) {
      expect(err.message).toBe('msg');
      expect(err.status).toBe(400);
      expect(err.expose).toBeTruthy();
      expect(err.prop).toBeTruthy();
    }
  });

  describe('when props include status', () => {
    it('should be ignored', () => {
      const ctx = context();

      try {
        ctx.throw(400, 'msg', {
          prop: true,
          status: -1
        });
      } catch (err) {
        expect(err.message).toBe('msg');
        expect(err.status).toBe(400);
        expect(err.expose).toBeTruthy();
        expect(err.prop).toBeTruthy();
      }
    });
  });
});

describe('ctx.throw(msg, props)', () => {
  it('should mixin props', () => {
    const ctx = context();

    try {
      ctx.throw('msg', { prop: true });
    } catch (err) {
      expect(err.message).toBe('msg');
      expect(err.status).toBe(500);
      expect(err.expose).toBeFalsy();
      expect(err.prop).toBeTruthy();
    }
  });
});

describe('ctx.throw(status, props)', () => {
  it('should mixin props', () => {
    const ctx = context();

    try {
      ctx.throw(400, { prop: true });
    } catch (err) {
      expect(err.message).toBe('Bad Request');
      expect(err.status).toBe(400);
      expect(err.expose).toBeTruthy();
      expect(err.prop).toBeTruthy();
    }
  });
});

describe('ctx.throw(err, props)', () => {
  it('should mixin props', () => {
    const ctx = context();

    try {
      ctx.throw(new Error('test'), { prop: true });
    } catch (err) {
      expect(err.message).toBe('test');
      expect(err.status).toBe(500);
      expect(err.expose).toBeFalsy();
      expect(err.prop).toBeTruthy();
    }
  });
});
