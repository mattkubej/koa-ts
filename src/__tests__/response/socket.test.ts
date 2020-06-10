import { response } from '../helpers/context';
import { Socket } from 'net';

describe('res.socket', () => {
  it('should return the request socket object', () => {
    const res = response();
    expect(res.socket instanceof Socket).toBeTruthy();
  });
});
