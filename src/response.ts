import http from 'http';
import { Socket } from "net";

import vary from 'vary';
import { extname } from 'path';
import contentDisposition from 'content-disposition';
import getType from 'cache-content-type';
import typeis from 'type-is';

import only from './utils/only';

import Application from './application';
import Context from './context';
import Request from './request';

export default class Response {

  public req: http.IncomingMessage;
  public res: http.ServerResponse;

  public app: Application;
  public ctx: Context;
  public request: Request;

  public _explicitNullBody: boolean;
  private _body: any;

  get sockect(): Socket {
    return this.res.socket;
  }

  get header(): http.OutgoingHttpHeaders {
    // Note: previously had support for Node < 7.7
    // accessed this.res._headers
    return this.res.getHeaders();
  }

  get headers(): http.OutgoingHttpHeaders {
    return this.header;
  }

  get status(): number {
    return this.res.statusCode;
  }

  get headerSent(): boolean {
    return this.res.headersSent;
  }

  vary(field: string | string[]) {
    if (this.headerSent) return;

    vary(this.res, field);
  }

  is(type: string, ...types: string[]): string | false | null {
    return typeis(this.type, type, ...types);
  }

  get(field: string): string | number | string[] {
    return this.res.getHeader(field);

    // previous implementation
    //return this.header[field.toLowerCase()] || '';
  }

  has(field: string): boolean {
    // Removed support for Node 7.7
    // field.toLowerCase() in this.headers
    return this.res.hasHeader(field);
  }

  set(field: string | string[], val: string | number | string[]) {
    if (this.headerSent) return;

    if (field instanceof Array) {
      for (const key in field) {
        this.set(key, field[key]);
      }
    } else {
      if (Array.isArray(val)) val = val.map(v => typeof v === 'string' ? v : String(v));
      else if (typeof val !== 'string') val = String(val);
      this.res.setHeader(field, val);
    }
  }

  append(field: string, val: string | number | string[]) {
    const prev = this.get(field);

    // TODO: this is gross figure out something better
    if (prev && typeof val !== 'number') {
      if (prev instanceof Array) {
        this.set(field, prev.concat(val));
      } else { 
        this.set(field, [<string> prev].concat(val));
      }
    } else {
      this.set(field, val);
    }


    // previous implementation
    //if (prev) {
      //val = Array.isArray(prev)
        //? prev.concat(val)
        //: [prev].concat(val);
    //}

    // TODO: why is this returning?
    //return this.set(field, val);
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

  flushHeaders() {
    this.res.flushHeaders();
  }

  toJSON(): object {
    return only(this, [
      'status',
      'message',
      'header'
    ]);
  }

  inspect() {
    if (!this.res) return;
    const o = this.toJSON();
    o.body = this.body;
    return o;
  }

  set etag(val: string) {
    if (!/^(W\/)?"/.test(val)) val = `"${val}"`;
    this.set('ETag', val);
  }

  get etag() {
    return this.get('ETag');
  }

  get type(): string {
    const type = this.get('Content-Type');
    if (typeof type === 'string') {
      return type.split(';', 1)[0];
    } else {
      return '';
    }

    // Previous implementation
    //const type = this.get('Content-Type');
    //if (!type) return '';
    //return type.split(';', 1)[0];
  }

  set lastModified(val: string | Date) {
    if ('string' === typeof val) val = new Date(val);
    this.set('Last-Modified', val.toUTCString());
  }

  get lastModified(): Date {
    const date = this.get('last-modified');
    if (date) return new Date(date);
  }

  set type(type) {
    type = getType(type);
    if (type) {
      this.set('Content-Type', type);
    } else {
      this.remove('Content-Type');
    }
  }

  attachment(filename: string, options: contentDisposition.Options) {
    if (filename) this.type = extname(filename);
    this.set('Content-Disposition', contentDisposition(filename, options));
  }

  redirect(url, alt) {
    // location
    if ('back' === url) url = this.ctx.get('Referrer') || alt || '/';
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

  set length(n) {
    this.set('Content-Length', n);
  }

  get length() {
    if (this.has('Content-Length')) {
      return parseInt(this.get('Content-Length'), 10) || 0;
    }

    const { body } = this;
    if (!body || body instanceof Stream) return undefined;
    if ('string' === typeof body) return Buffer.byteLength(body);
    if (Buffer.isBuffer(body)) return body.length;
    return Buffer.byteLength(JSON.stringify(body));
  }

  get body() {
    return this._body;
  }

  set body(val) {
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

  get message() {
    return this.res.statusMessage || statuses[this.status];
  }

  set message(msg) {
    this.res.statusMessage = msg;
  }
  
  set status(code) {
    if (this.headerSent) return;

    assert(Number.isInteger(code), 'status code must be a number');
    assert(code >= 100 && code <= 999, `invalid status code: ${code}`);
    this._explicitStatus = true;
    this.res.statusCode = code;
    if (this.req.httpVersionMajor < 2) this.res.statusMessage = statuses[code];
    if (this.body && statuses.empty[code]) this.body = null;
  }
}

// TODO: util.inspect.custom
