import httpAssert from 'http-assert';
import createError from 'http-errors';
import statuses from 'statuses';
import Cookies from 'cookies';
import http from 'http';
import util from 'util';

import Application from './application';
import Request from './request';
import Response from './response';

const COOKIES = Symbol('context#cookies');

export default class Context {

  public assert: Function;

  public req: http.IncomingMessage;
  public res: http.ServerResponse;
  public request: Request;
  public response: Response;
  public app: Application;

  public status: number;
  public length: number;
  public originalUrl: string;
  public headerSent: boolean;
  public writable: boolean;
  public type: string;
  public state: object;

  public respond: boolean;
  public body: any;
  public method: string;
  public message: string;

  constructor() {
    this.assert = httpAssert;
  }

  toJSON() {
    return {
      request: this.request.toJSON(),
      response: this.response.toJSON(),
      app: this.app.toJSON(),
      originalUrl: this.originalUrl,
      req: '<original node req>',
      res: '<original node res>',
      socket: '<original node socket>'
    };
  }

  inspect() {
    return this.toJSON();
  }

  throw(...args: createError.UnknownError[]) {
    throw createError(...args);
  }

  onerror(err: any) {
    // don't do anything if there is no error.
    // this allows you to pass `this.onerror`
    // to node-style callbacks.
    if (null == err) return;

    if (!(err instanceof Error)) err = new Error(util.format('non-error thrown: %j', err));

    let headerSent = false;
    if (this.headerSent || !this.writable) {
      headerSent = err.headerSent = true;
    }

    // delegate
    this.app.emit('error', err, this);

    // nothing we can do here other
    // than delegate to the app-level
    // handler and log.
    if (headerSent) {
      return;
    }

    const { res } = this;

    // first unset all headers
    res.getHeaderNames().forEach(name => res.removeHeader(name));

    // original implementation
    // first unset all headers
    /* istanbul ignore else */
    //if (typeof res.getHeaderNames === 'function') {
      //res.getHeaderNames().forEach(name => res.removeHeader(name));
    //} else {
      //res._headers = {}; // Node < 7.7
    //}

    // then set those specified
    this.set(err.headers);

    // force text/plain
    this.type = 'text';

    let statusCode = err.status || err.statusCode;

    // ENOENT support
    if ('ENOENT' === err.code) statusCode = 404;

    // default to 500
    if ('number' !== typeof statusCode || !statuses[statusCode]) statusCode = 500;

    // respond
    const code = statuses[statusCode];
    const msg = err.expose ? err.message : code;
    this.status = err.status = statusCode;
    this.length = Buffer.byteLength(msg);
    res.end(msg);
  }

  get cookies() {
    if (!this[COOKIES]) {
      this[COOKIES] = new Cookies(this.req, this.res, {
        keys: this.app.keys,
        secure: this.request.secure
      });
    }
    return this[COOKIES];
  }

  set cookies(_cookies) {
    this[COOKIES] = _cookies;
  }
}
