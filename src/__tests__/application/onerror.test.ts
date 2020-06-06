import Koa, { KoaError } from '../../application';
import mm from 'mm';

describe('app.onerror(err)', () => {
    afterEach(mm.restore);

    it('should throw an error if a non-error is given', () => {
      const app = new Koa();

      expect(() => {
        app.onerror('foo');
      }).toThrow(new TypeError('non-error thrown: \"foo\"'));
    });

    it('should do nothing if status is 404', () => {
      const app = new Koa();
      const err = new KoaError();

      err.status = 404;

      let called = false;
      mm(console, 'error', () => { called = true; });
      app.onerror(err);
      expect(!called).toBeTruthy();
    });

    it('should do nothing if .silent', () => {
      const app = new Koa();
      app.silent = true;
      const err = new Error();

      let called = false;
      mm(console, 'error', () => { called = true; });
      app.onerror(err);
      expect(!called).toBeTruthy();
    });

    it('should log the error to stderr', () => {
      const app = new Koa();
      app.env = 'dev';

      const err = new Error();
      err.stack = 'Foo';

      let msg = '';
      mm(console, 'error', (input: string) => {
        if (input) msg = input;
      });
      app.onerror(err);
      expect(msg).toBe('  Foo');
    });

    it('should use err.toString() instad of err.stack', () => {
      const app = new Koa();
      app.env = 'dev';

      const err = new Error('mock stack null');
      err.stack = null;

      app.onerror(err);

      let msg = '';
      mm(console, 'error', (input: string) => {
        if (input) msg = input;
      });
      app.onerror(err);
      expect(msg).toBe('  Error: mock stack null');
    });
  });


