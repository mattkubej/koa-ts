import httpAssert from 'http-assert';
import createError from 'http-errors';
import statuses from 'statuses';
import Cookies from 'cookies';
import http from 'http';
import util from 'util';
import { Socket } from 'net';
import accepts from 'accepts';

import Application, { ApplicationJSON } from './application';
import Request, { RequestJSON } from './request';
import Response, { ResponseJSON } from './response';
import isError from './utils/isError';

import contentDisposition from 'content-disposition';

const COOKIES = Symbol('context#cookies');

type ContextJSON = {
  request: RequestJSON;
  response: ResponseJSON;
  app: ApplicationJSON;
  originalUrl: string;
  req: string;
  res: string;
  socket: string;
};

export default class Context {
  public assert: Function;

  public req: http.IncomingMessage;
  public res: http.ServerResponse;
  public request: Request;
  public response: Response;
  public app: Application;

  public originalUrl: string;
  public state: object;

  public respond: boolean;

  constructor() {
    this.assert = httpAssert;
  }

  toJSON(): ContextJSON {
    return {
      request: this.request.toJSON(),
      response: this.response.toJSON(),
      app: this.app.toJSON(),
      originalUrl: this.originalUrl,
      req: '<original node req>', // TODO: why return strings here?
      res: '<original node res>',
      socket: '<original node socket>'
    };
  }

  inspect(): ContextJSON {
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

    // SystemError returned from stream errors
    // fails the instanceof Error check
    if (!isError(err)) {
      err = new Error(util.format('non-error thrown: %j', err));
    }

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
    // if (typeof res.getHeaderNames === 'function') {
    // res.getHeaderNames().forEach(name => res.removeHeader(name));
    // } else {
    // res._headers = {}; // Node < 7.7
    // }

    // Note: previously no guard here
    if (err.headers) this.set(err.headers);

    // force text/plain
    this.type = 'text';

    let statusCode = err.status || err.statusCode;

    // ENOENT support
    if ('ENOENT' === err.code) statusCode = 404;

    // default to 500
    if ('number' !== typeof statusCode || !statuses.message[statusCode]) statusCode = 500;

    // respond
    const code = statuses.message[statusCode];
    const msg = err.expose ? err.message : code;
    this.status = err.status = statusCode;
    this.length = Buffer.byteLength(msg);
    res.end(msg);
  }

  get cookies(): Cookies {
    if (!this[COOKIES]) {
      this[COOKIES] = new Cookies(this.req, this.res, {
        keys: this.app.keys,
        secure: this.request.secure
      });
    }
    return this[COOKIES];
  }

  set cookies(_cookies: Cookies) {
    this[COOKIES] = _cookies;
  }

  /* Response delegation */

  public attachment(filename?: string, options?: contentDisposition.Options) {
    this.response.attachment(filename, options);
  }

  public redirect(url: string, alt?: string) {
    this.response.redirect(url, alt);
  }

  public remove(field: string) {
    this.response.remove(field);
  }

  public vary(field: string) {
    this.response.vary(field);
  }

  public has(field: string): boolean {
    return this.response.has(field);
  }

  public set(field: string | object | string[], val?: string | number | string[]) {
    this.response.set(field, val);
  }

  public append(field: string, val: string | string[]) {
    this.response.append(field, val);
  }

  public flushHeaders() {
    this.response.flushHeaders();
  }

  set status(code: number) {
    this.response.status = code;
  }

  get status(): number {
    return this.response.status;
  }

  set message(msg: string) {
    this.response.message = msg;
  }

  get message(): string {
    return this.response.message;
  }

  set body(val: any) {
    this.response.body = val;
  }

  get body(): any {
    return this.response.body;
  }

  set length(n: number) {
    this.response.length = n;
  }

  get length(): number {
    return this.response.length;
  }

  set type(type: string) {
    this.response.type = type;
  }

  get type(): string {
    return this.response.type;
  }

  set lastModified(val: Date | string) {
    this.response.lastModified = val;
  }

  get lastModified(): Date | string {
    return this.response.lastModified;
  }

  set etag(val: string) {
    this.response.etag = val;
  }

  get etag(): string {
    return this.response.etag;
  }

  get headerSent(): boolean {
    return this.response.headerSent;
  }

  get writable(): boolean {
    return this.response.writable;
  }

  /* Request delegation */

  public acceptsLanguages(languages?: string | string[], ...args: string[]): string | string[] | false {
    if (Array.isArray(languages)) {
      return this.request.acceptsLanguages(languages);
    } else {
      return this.request.acceptsLanguages(languages, ...args);
    }
  }

  public acceptsEncodings(encodings?: string | string[], ...args: string[]): string | string[] | false {
    if (Array.isArray(encodings)) {
      return this.request.acceptsEncodings(encodings);
    } else {
      return this.request.acceptsEncodings(encodings, ...args);
    }
  }

  public acceptsCharsets(charsets?: string | string[], ...args: string[]): string | string[] | false {
    if (Array.isArray(charsets)) {
      return this.request.acceptsCharsets(charsets);
    } else {
      return this.request.acceptsCharsets(charsets, ...args);
    }
  }

  public accepts(types?: string | string[], ...args: string[]): string | string[] | false {
    if (Array.isArray(types)) {
      return this.accept.types(types);
    } else {
      return this.accept.types(types, ...args);
    }
  }

  public get(field: string): string | string[] {
    return this.request.get(field);
  }

  public is(type: string, ...types: string[]): string | false | null {
    return this.request.is(type, ...types);
  }

  // TODO: types
  set querystring(str) {
    this.request.querystring = str;
  }

  // TODO: types
  get querystring() {
    return this.request.querystring;
  }

  // TODO: why was this delegated access? no setter on request
  get idempotent(): boolean {
    return this.request.idempotent;
  }

  // TODO: why was this delegated access? no setter on request
  get socket(): Socket {
    return this.request.socket;
  }

  set search(str: string) {
    this.request.search = str;
  }

  get search(): string {
    return this.request.search;
  }

  set method(val: string) {
    this.request.method = val;
  }

  get method(): string {
    return this.request.method;
  }

  // TODO: types
  set query(obj) {
    this.request.query = obj;
  }

  // TODO: types
  get query() {
    return this.request.query;
  }

  set path(path: string) {
    this.request.path = path;
  }

  get path() {
    return this.request.path;
  }

  set url(url: string) {
    this.request.url = url;
  }

  get url(): string {
    return this.request.url;
  }

  // TODO: types
  set accept(obj) {
    this.request.accept = obj;
  }

  get accept(): accepts.Accepts {
    return this.request.accept;
  }

  get origin(): string {
    return this.request.origin;
  }

  get href(): string {
    return this.request.href;
  }

  get subdomains(): string[] {
    return this.request.subdomains;
  }

  get protocol(): string {
    return this.request.protocol;
  }

  get host(): string {
    return this.request.host;
  }

  get hostname(): string {
    return this.request.hostname;
  }

  get URL(): URL {
    return this.request.URL;
  }

  get header(): http.IncomingHttpHeaders {
    return this.request.header;
  }

  get headers(): http.IncomingHttpHeaders {
    return this.request.headers;
  }

  get secure(): boolean {
    return this.request.secure;
  }

  get stale(): boolean {
    return this.request.stale;
  }

  get fresh(): boolean {
    return this.request.fresh;
  }

  get ips(): string[] {
    return this.request.ips;
  }

  get ip(): string {
    return this.request.ip;
  }
}
