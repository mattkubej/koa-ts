import http from 'http';
import { Socket } from "net";

import vary from 'vary';
import { extname } from 'path';
import contentDisposition from 'content-disposition';
import getType from 'cache-content-type';
import typeis from 'type-is';
import assert from 'assert';
import statuses from 'statuses';
import Stream from 'stream';
import destroy from 'destroy';
import onFinish from 'on-finished';
import encodeUrl from 'encodeurl';
import escape from 'escape-html';

import only from './utils/only';

import Application from './application';
import Context from './context';
import Request from './request';

export type ResponseJSON = {
  status?: any;
  message?: any;
  header?: any;
  body?: any;
};

export default class Response {

  public req: http.IncomingMessage;
  public res: http.ServerResponse;

  public app: Application;
  public ctx: Context;
  public request: Request;

  public _explicitNullBody: boolean;
  private _body: any;
  private _explicitStatus: boolean;

  // Note: was this a bug? originally returned this.res.socket
  get socket(): Socket {
    return this.req.socket;
  }

  get header(): http.OutgoingHttpHeaders {
    return this.res.getHeaders();
  }

  get headers(): http.OutgoingHttpHeaders {
    return this.header;
  }

  get status(): number {
    return this.res.statusCode;
  }

  set status(code: number) {
    if (this.headerSent) return;

    assert(Number.isInteger(code), 'status code must be a number');
    assert(code >= 100 && code <= 999, `invalid status code: ${code}`);
    this._explicitStatus = true;
    this.res.statusCode = code;
    if (this.req.httpVersionMajor < 2) this.res.statusMessage = statuses.message[code];
    if (this.body && statuses.empty[code]) this.body = null;
  }

  get message(): string {
    return this.res.statusMessage || statuses.message[this.status];
  }

  set message(msg: string) {
    this.res.statusMessage = msg;
  }

  // TODO: set appropriate type
  get body(): any {
    return this._body;
  }

  set body(val: any) {
    const original = this._body;
    this._body = val;

    // no content
    if (null == val) {
      if (!statuses.empty[this.status]) this.status = 204;
      if (val === null) this._explicitNullBody = true;
      this.remove('Content-Type');
      this.remove('Content-Length');
      this.remove('Transfer-Encoding');
      return;
    }

    // set the status
    if (!this._explicitStatus) this.status = 200;

    // set the content-type only if not yet set
    const setType = !this.has('Content-Type');

    // string
    if ('string' === typeof val) {
      if (setType) this.type = /^\s*</.test(val) ? 'html' : 'text';
      this.length = Buffer.byteLength(val);
      return;
    }

    // buffer
    if (Buffer.isBuffer(val)) {
      if (setType) this.type = 'bin';
      this.length = val.length;
      return;
    }

    // stream
    if (val instanceof Stream) {
      onFinish(this.res, destroy.bind(null, val));
      if (original != val) {
        val.once('error', err => this.ctx.onerror(err));
        // overwriting
        if (null != original) this.remove('Content-Length');
      }

      if (setType) this.type = 'bin';
      return;
    }

    // json
    this.remove('Content-Length');
    this.type = 'json';
  }

  set length(n: number) {
    this.set('Content-Length', n);
  }

  get length(): number {
    if (this.has('Content-Length')) {
      return parseInt(<string> this.get('Content-Length'), 10) || 0;
    }

    const { body } = this;
    if (!body || body instanceof Stream) return undefined;
    if ('string' === typeof body) return Buffer.byteLength(body);
    if (Buffer.isBuffer(body)) return body.length;
    return Buffer.byteLength(JSON.stringify(body));
  }

  get headerSent(): boolean {
    return this.res.headersSent;
  }

  vary(field: string) {
    if (this.headerSent) return;

    vary(this.res, field);
  }

  redirect(url: string, alt?: string) {
    // location
    if ('back' === url) url = <string> this.ctx.get('Referrer') || alt || '/';
    this.set('Location', encodeUrl(url));

    // status
    if (!statuses.redirect[this.status]) this.status = 302;

    // html
    if (this.ctx.accepts('html')) {
      url = escape(url);
      this.type = 'text/html; charset=utf-8';
      this.body = `Redirecting to <a href="${url}">${url}</a>.`;
      return;
    }

    // text
    this.type = 'text/plain; charset=utf-8';
    this.body = `Redirecting to ${url}.`;
  }

  /**
   * Set Content-Disposition header to "attachment" with optional `filename`.
   *
   * @param {String} filename
   * @api public
   */

  attachment(filename: string, options?: contentDisposition.Options) {
    if (filename) this.type = extname(filename);
    this.set('Content-Disposition', contentDisposition(filename, options));
  }

  set type(type: string) {
    type = getType(type);
    if (type) {
      this.set('Content-Type', type);
    } else {
      this.remove('Content-Type');
    }
  }

  set lastModified(val: string | Date) {
    if ('string' === typeof val) val = new Date(val);
    this.set('Last-Modified', val.toUTCString());
  }

  // TODO: set and get have to match types
  get lastModified(): Date | string {
    const date = <string> this.get('last-modified');
    if (date) return new Date(date);
  }

  set etag(val: string) {
    if (!/^(W\/)?"/.test(val)) val = `"${val}"`;
    this.set('ETag', val);
  }

  get etag(): string {
    return <string> this.get('ETag');
  }

  get type(): string {
    const type = <string> this.get('Content-Type');
    if (!type) return '';
    return type.split(';', 1)[0];
  }

  /**
   * Check whether the response is one of the listed types.
   * Pretty much the same as `this.request.is()`.
   *
   * @param {String|String[]} [type]
   * @param {String[]} [types]
   * @return {String|false}
   * @api public
   */
  is(type: string, ...types: string[]): string | false {
    return typeis.is(this.type, type, ...types);
  }

  get(field: string): string | number | string[] {
    return this.header[field.toLowerCase()] || '';
  }

  has(field: string): boolean {
    return this.res.hasHeader(field);
  }

  // TODO: why in the original implementation was field potentially an array?
  set(field: string | object, val?: string | number | string[]) {
    if (this.headerSent) return;

    if (typeof field === 'object') {
      for (const key in field) {
        this.set(key, field[key]);
      }
    } else {
      this.res.setHeader(field, val);
    }
  }

  append(field: string, val: string | string[]) {
    const prev = this.get(field);

    if (prev) {
      if (Array.isArray(prev)) {
        val = prev.concat(val);
      } else {
        val = [String(prev)].concat(val);
      }
    }

    return this.set(field, val);
  }

  remove(field: string) {
    if (this.headerSent) return;

    this.res.removeHeader(field);
  }

  get writable(): boolean {
    // can't write any more after response finished
    // response.writableEnded is available since Node > 12.9
    // https://nodejs.org/api/http.html#http_response_writableended
    // response.finished is undocumented feature of previous Node versions
    // https://stackoverflow.com/questions/16254385/undocumented-response-finished-in-node-js
    if (this.res.writableEnded || this.res.finished) return false;

    const socket = this.res.socket;
    // There are already pending outgoing res, but still writable
    // https://github.com/nodejs/node/blob/v4.4.7/lib/_http_server.js#L486
    if (!socket) return true;
    return socket.writable;
  }

  inspect(): ResponseJSON {
    if (!this.res) return;
    const o = this.toJSON();
    o.body = this.body;
    return o;
  }

  toJSON(): ResponseJSON {
    return only(this, [
      'status',
      'message',
      'header'
    ]);
  }

  flushHeaders() {
    this.res.flushHeaders();
  }
}

// TODO: util.inspect.custom
