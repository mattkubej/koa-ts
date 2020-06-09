import qs from 'querystring';
import parseurl from 'parseurl';
import { format, URL } from 'url';

import http from 'http';
import net, { Socket } from "net";
import { TLSSocket } from "tls";

import contentType from 'content-type';
import accepts from 'accepts';
import typeis from 'type-is';
import fresh from 'fresh';
import only from './utils/only';

import Application from './application';
import Context from './context';
import Response from './response';

const IP = Symbol('context#ip');

export default class Request {

  public req: http.IncomingMessage;
  public res: http.ServerResponse;

  public app: Application;
  public ctx: Context;
  public response: Response;

  public originalUrl: string;
  private _querycache: object;
  private memoizedURL: URL;
  private _accept: accepts.Accepts;

  get header(): http.IncomingHttpHeaders {
    return this.req.headers;
  }

  set header(val: http.IncomingHttpHeaders) {
    this.req.headers = val;
  }

  get headers(): http.IncomingHttpHeaders {
    return this.req.headers;
  }

  set headers(val:http.IncomingHttpHeaders) {
    this.req.headers = val;
  }

  get url(): string {
    return this.req.url;
  }

  set url(val: string) {
    this.req.url = val;
  }

  get origin(): string {
    return `${this.protocol}://${this.host}`;
  }

  get href(): string {
    // support: `GET http://example.com/foo`
    if (/^https?:\/\//i.test(this.originalUrl)) return this.originalUrl;
    return this.origin + this.originalUrl;
  }

  get method(): string {
    return this.req.method;
  }

  set method(val: string) {
    this.req.method = val;
  }

  get path(): string {
    return parseurl(this.req).pathname;
  }

  set path(path: string) {
    const url = parseurl(this.req);
    if (url.pathname === path) return;

    url.pathname = path;
    url.path = null;

    this.url = format(url);
  }

  // TODO: add types here
  get query() {
    const str = this.querystring;
    const c = this._querycache = this._querycache || {};
    return c[str] || (c[str] = qs.parse(str));
  }

  // TODO: add types here
  set query(obj) {
    this.querystring = qs.stringify(obj);
  }

  get querystring(): string {
    if (!this.req) return '';
    return <string> parseurl(this.req).query || '';
  }

  set querystring(str: string) {
    const url = parseurl(this.req);
    if (url.search === `?${str}`) return;

    url.search = str;
    url.path = null;

    this.url = format(url);
  }

  get search(): string {
    if (!this.querystring) return '';
    return `?${this.querystring}`;
  }

  set search(str: string) {
    this.querystring = str;
  }

  get host(): string {
    const proxy = this.app.proxy;
    let host = proxy && <string> this.get('X-Forwarded-Host');
    if (!host) {
      if (this.req.httpVersionMajor >= 2) host = <string> this.get(':authority');
      if (!host) host = <string> this.get('Host');
    }
    if (!host) return '';
    return host.split(/\s*,\s*/, 1)[0];
  }

  get hostname(): string {
    const host = this.host;
    if (!host) return '';
    if ('[' === host[0]) return this.URL.hostname || ''; // IPv6
    return host.split(':', 1)[0];
  }

  get URL(): URL {
    /* istanbul ignore else */
    if (!this.memoizedURL) {
      const originalUrl = this.originalUrl || ''; // avoid undefined in template string
      try {
        this.memoizedURL = new URL(`${this.origin}${originalUrl}`);
      } catch (err) {
        this.memoizedURL = Object.create(null);
      }
    }
    return this.memoizedURL;
  }

  get fresh(): boolean {
    const method = this.method;
    const s = this.ctx.status;

    // GET or HEAD for weak freshness validation only
    if ('GET' !== method && 'HEAD' !== method) return false;

    // 2xx or 304 as per rfc2616 14.26
    if ((s >= 200 && s < 300) || 304 === s) {
      return fresh(this.header, this.response.header);
    }

    return false;
  }

  get stale(): boolean {
    return !this.fresh;
  }

  get idempotent(): boolean {
    const methods = ['GET', 'HEAD', 'PUT', 'DELETE', 'OPTIONS', 'TRACE'];
    return !!~methods.indexOf(this.method);
  }

  get socket(): Socket {
    return this.req.socket;
  }

  get charset(): string {
    try {
      const { parameters } = contentType.parse(this.req);
      return parameters.charset || '';
    } catch (e) {
      return '';
    }
  }

  get length(): number {
    const len = this.get('Content-Length');
    if (len === '') return;
    return ~~len;
  }

  get protocol(): string {
    // TODO: not sure if this is right
    if (this.socket instanceof TLSSocket) return 'https';
    if (!this.app.proxy) return 'http';
    const proto = <string> this.get('X-Forwarded-Proto');
    return proto ? proto.split(/\s*,\s*/, 1)[0] : 'http';
  }

  get secure(): boolean {
    return 'https' === this.protocol;
  }

  get ips(): string[] {
    const proxy = this.app.proxy;
    const val = <string> this.get(this.app.proxyIpHeader);
    let ips = proxy && val
      ? val.split(/\s*,\s*/)
      : [];
    if (this.app.maxIpsCount > 0) {
      ips = ips.slice(-this.app.maxIpsCount);
    }
    return ips;
  }

  get ip(): string {
    if (!this[IP]) {
      this[IP] = this.ips[0] || this.socket.remoteAddress || '';
    }
    return this[IP];
  }

  set ip(_ip: string) {
    this[IP] = _ip;
  }

  get subdomains(): string[] {
    const offset = this.app.subdomainOffset;
    const hostname = this.hostname;
    if (net.isIP(hostname)) return [];
    return hostname
      .split('.')
      .reverse()
      .slice(offset);
  }

  get accept(): accepts.Accepts {
    return this._accept || (this._accept = accepts(this.req));
  }

  set accept(obj) {
    this._accept = obj;
  }

  accepts(types?: string | string[], ...args: string[]): string | string[] | false {
    if (Array.isArray(types)) {
      return this.accept.types(types);
    } else {
      return this.accept.types(types, ...args);
    }
  }

  acceptsEncodings(...args: string[]): string | false {
    return this.accept.encodings(...args);
  }

  acceptsCharsets(...args: string[]): string | false {
    return this.accept.charsets(...args);
  }

  acceptsLanguages(...args: string[]): string | false {
    return this.accept.languages(...args);
  }

  /**
   * Check if the incoming request contains the "Content-Type"
   * header field, and it contains any of the give mime `type`s.
   * If there is no request body, `null` is returned.
   * If there is no content type, `false` is returned.
   * Otherwise, it returns the first `type` that matches.
   *
   * Examples:
   *
   *     // With Content-Type: text/html; charset=utf-8
   *     this.is('html'); // => 'html'
   *     this.is('text/html'); // => 'text/html'
   *     this.is('text/*', 'application/json'); // => 'text/html'
   *
   *     // When Content-Type is application/json
   *     this.is('json', 'urlencoded'); // => 'json'
   *     this.is('application/json'); // => 'application/json'
   *     this.is('html', 'application/*'); // => 'application/json'
   *
   *     this.is('html'); // => false
   *
   * @param {String|String[]} [type]
   * @param {String[]} [types]
   * @return {String|false|null}
   * @api public
   */

  is(type: string, ...types: string[]): string | false | null {
    return typeis(this.req, type, ...types);
  }

  get type(): string {
    const type = <string> this.get('Content-Type');
    if (!type) return '';
    return type.split(';')[0];
  }

  get(field: string): string | string[] {
    const req = this.req;
    switch (field = field.toLowerCase()) {
      case 'referer':
      case 'referrer':
        return req.headers.referrer || req.headers.referer || '';
      default:
        return req.headers[field] || '';
    }
  }

  inspect(): object {
    if (!this.req) return;
    return this.toJSON();
  }

  toJSON(): object {
    return only(this, [
      'method',
      'url',
      'header'
    ]);
  }
}

// TODO: util.inspect.custom
