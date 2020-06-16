import context from '../helpers/context';
import { KoaError } from '../../application';

describe('ctx.throw(msg)', () => {
  it('should set .status to 500', () => {
    expect(() => {
      const ctx = context();
      ctx.throw('boom');
    }).toThrow(
      expect.objectContaining({ status: 500, expose: false })
    );
  });
});

describe('ctx.throw(err)', () => {
  it('should set .status to 500', () => {
    expect(() => {
      const ctx = context();
      const err = new Error('test');
      ctx.throw(err);
    }).toThrow(
      expect.objectContaining({ status: 500, expose: false, message: 'test' })
    );
  });
});

describe('ctx.throw(err, status)', () => {
  it('should throw the error and set .status', () => {
    expect(() => {
      const ctx = context();
      const error = new Error('test');
      ctx.throw(error, 422);
    }).toThrow(
      expect.objectContaining({ status: 422, expose: true, message: 'test' })
    );
  });
});

describe('ctx.throw(status, err)', () => {
  it('should throw the error and set .status', () => {
    expect(() => {
      const ctx = context();
      const error = new Error('test');
      ctx.throw(422, error);
    }).toThrow(
      expect.objectContaining({ status: 422, expose: true, message: 'test' })
    );
  });
});

describe('ctx.throw(msg, status)', () => {
  it('should throw an error', () => {
    expect(() => {
      const ctx = context();
      ctx.throw('name required', 400);
    }).toThrow(
      expect.objectContaining({ status: 400, expose: true, message: 'name required' })
    );
  });
});

describe('ctx.throw(status, msg)', () => {
  it('should throw an error', () => {
    expect(() => {
      const ctx = context();
      ctx.throw(400, 'name required');
    }).toThrow(
      expect.objectContaining({ status: 400, expose: true, message: 'name required' })
    );
  });
});

describe('ctx.throw(status)', () => {
  it('should throw an error', () => {
    expect(() => {
      const ctx = context();
      ctx.throw(400);
    }).toThrow(
      expect.objectContaining({ status: 400, expose: true, message: 'Bad Request' })
    );
  });

  describe('when not valid status', () => {
    it('should not expose', () => {
      expect(() => {
        const ctx = context();
        const err = new KoaError('some error');
        err.status = -1;
        ctx.throw(err);
      }).toThrow(
        expect.objectContaining({ expose: false, message: 'some error' })
      );
    });
  });
});

describe('ctx.throw(status, msg, props)', () => {
  it('should mixin props', () => {
    expect(() => {
      const ctx = context();
      ctx.throw(400, 'msg', { prop: true });
    }).toThrow(
      expect.objectContaining({ status: 400, expose: true, message: 'msg', prop: true })
    );
  });

  describe('when props include status', () => {
    it('should be ignored', () => {
      expect(() => {
        const ctx = context();
        ctx.throw(400, 'msg', {
          prop: true,
          status: -1
        });
      }).toThrow(
        expect.objectContaining({ status: 400, expose: true, message: 'msg', prop: true })
      );
    });
  });
});

describe('ctx.throw(msg, props)', () => {
  it('should mixin props', () => {
    expect(() => {
      const ctx = context();
      ctx.throw('msg', { prop: true });
    }).toThrow(
      expect.objectContaining({ status: 500, expose: false, message: 'msg', prop: true })
    );
  });
});

describe('ctx.throw(status, props)', () => {
  it('should mixin props', () => {
    expect(() => {
      const ctx = context();
      ctx.throw(400, { prop: true });
    }).toThrow(
      expect.objectContaining({ status: 400, expose: true, message: 'Bad Request', prop: true })
    );
  });
});

describe('ctx.throw(err, props)', () => {
  it('should mixin props', () => {
    expect(() => {
      const ctx = context();
      ctx.throw(new Error('test'), { prop: true });
    }).toThrow(
      expect.objectContaining({ status: 500, expose: false, message: 'test', prop: true })
    );
  });
});
