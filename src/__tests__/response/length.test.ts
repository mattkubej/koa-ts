import { response } from '../helpers/context';
import fs from 'fs';

// Note: Is this just to support node 7.7?
// describe('res.length', () => {
// describe('when Content-Length is defined', () => {
// it('should return a number', () => {
// const res = response();
// res.header['content-length'] = '120';
// expect(res.length).toBe(120);
// });
// });
// });

describe('res.length', () => {
  describe('when Content-Length is defined', () => {
    it('should return a number', () => {
      const res = response();
      res.set('Content-Length', '1024');
      expect(res.length).toBe(1024);
    });
  });

  describe('when Content-Length is not defined', () => {
    describe('and a .body is set', () => {
      it('should return a number', () => {
        const res = response();

        res.body = 'foo';
        res.remove('Content-Length');
        expect(res.length).toBe(3);

        res.body = 'foo';
        expect(res.length).toBe(3);

        res.body = Buffer.from('foo bar');
        res.remove('Content-Length');
        expect(res.length).toBe(7);

        res.body = Buffer.from('foo bar');
        expect(res.length).toBe(7);

        res.body = { hello: 'world' };
        res.remove('Content-Length');
        expect(res.length).toBe(17);

        res.body = { hello: 'world' };
        expect(res.length).toBe(17);

        res.body = fs.createReadStream('package.json');
        expect(res.length).toBeUndefined();

        res.body = null;
        expect(res.length).toBeUndefined();
      });
    });

    describe('and .body is not', () => {
      it('should return undefined', () => {
        const res = response();
        expect(res.length).toBeUndefined();
      });
    });
  });
});
