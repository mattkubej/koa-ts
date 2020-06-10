import { request } from '../helpers/context';

describe('req.secure', () => {
  it('should return true when encrypted', () => {
    const req = request();
    req.req.socket = { encrypted: true };
    expect(req.secure).toBeTruthy();
  });
});
