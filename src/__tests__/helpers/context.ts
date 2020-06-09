import Stream from 'stream';
import Koa from '../../application';
import http from 'http';

const context = (req?: http.IncomingMessage, res?: http.ServerResponse, app?: Koa) => {
  const socket = new Stream.Duplex();
  req = Object.assign({ headers: {}, socket }, Stream.Readable.prototype, req);
  res = Object.assign({ _headers: {}, socket }, Stream.Writable.prototype, res);
  (req.socket as any).remoteAddress = req.socket.remoteAddress || '127.0.0.1';
  app = app || new Koa();
  res.getHeader = k => (res as any)._headers[k.toLowerCase()];
  res.setHeader = (k, v) => (res as any)._headers[k.toLowerCase()] = v;
  res.removeHeader = (k) => { delete (res as any)._headers[k.toLowerCase()] };
  return app.createContext(req, res);
};

export default context;
export const request = (req?: http.IncomingMessage, res?: http.ServerResponse, app?: Koa) => context(req, res, app).request;
export const response = (req: http.IncomingMessage, res: http.ServerResponse, app: Koa) => context(req, res, app).response;
