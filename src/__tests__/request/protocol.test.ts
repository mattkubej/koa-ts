import { request } from '../helpers/context';
import { Socket } from 'net';
import { TLSSocket } from 'tls';

describe('req.protocol', () => {
  describe('when encrypted', () => {
    it('should return "https"', () => {
      const req = request();
      req.req.socket = { encrypted: true } as TLSSocket;
      expect(req.protocol).toBe('https');
    });
  });

  describe('when unencrypted', () => {
    it('should return "http"', () => {
      const req = request();
      req.req.socket = {} as Socket;
      expect(req.protocol).toBe('http');
    });
  });

  describe('when X-Forwarded-Proto is set', () => {
    describe('and proxy is trusted', () => {
      it('should be used', () => {
        const req = request();
        req.app.proxy = true;
        req.req.socket = {} as Socket;
        req.header['x-forwarded-proto'] = 'https, http';
        expect(req.protocol).toBe('https');
      });

      describe('and X-Forwarded-Proto is empty', () => {
        it('should return "http"', () => {
          const req = request();
          req.app.proxy = true;
          req.req.socket = {} as Socket;
          req.header['x-forwarded-proto'] = '';
          expect(req.protocol).toBe('http');
        });
      });
    });

    describe('and proxy is not trusted', () => {
      it('should not be used', () => {
        const req = request();
        req.req.socket = {} as Socket;
        req.header['x-forwarded-proto'] = 'https, http';
        expect(req.protocol).toBe('http');
      });
    });
  });
});
