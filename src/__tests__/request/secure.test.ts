import { request } from '../helpers/context';
import { Socket } from 'net';
import { TLSSocket } from 'tls';

describe('req.secure', () => {
  it('should return true when encrypted', () => {
    const req = request();
    req.req.socket = new TLSSocket(new Socket());
    expect(req.secure).toBeTruthy();
  });
});
