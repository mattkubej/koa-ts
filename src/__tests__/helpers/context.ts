import { Socket } from 'net';
import Koa from '../../application';
import http from 'http';

const context = (req?: http.IncomingMessage, res?: http.ServerResponse, app?: Koa) => {
  const socket = new Socket();
  req = Object.assign(new http.IncomingMessage(socket), req);
  res = Object.assign(new http.ServerResponse(req), res);
  app = app || new Koa();
  return app.createContext(req, res);
};

export default context;
export const request = (req?: http.IncomingMessage, res?: http.ServerResponse, app?: Koa) => context(req, res, app).request;
export const response = (req?: http.IncomingMessage, res?: http.ServerResponse, app?: Koa) => context(req, res, app).response;
