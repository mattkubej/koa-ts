import { EventEmitter } from 'events';
import http from 'http';
import Debug from 'debug';
import Deprecate from 'depd';
import isGeneratorFunction from 'is-generator-function';
import convert from 'koa-convert';
import compose from 'koa-compose';
import onFinished from 'on-finished';
import statuses from 'statuses';
import Stream from 'stream';
import util from 'util';

const debug = Debug('koa:application');
const deprecate = Deprecate('koa');

import Context from './context';
import Request from './request';
import Response from './response';

import only from './utils/only';

type Err = {
  expose?: boolean;
  status?: number;
};

type Options = {
  proxy?: boolean;
  subdomainOffset?: number;
  proxyIpHeader?: string;
  maxIpsCount?: number;
  env?: string;
  keys?: any; // TODO: what type is this?
};

export default class Application extends EventEmitter {

  public silent: boolean;

  // TODO: validate types;
  public proxy: boolean;
  public proxyIpHeader: string;
  public maxIpsCount: number;
  public subdomainOffset: number;
  public keys: any;

  private env: string;
  private middleware: any[];

  //private context: Context;
  //private request: Request;
  //private response: Response;

  constructor(options: Options = {}) {
    super()
    this.proxy = options.proxy || false;
    this.subdomainOffset = options.subdomainOffset || 2;
    this.proxyIpHeader = options.proxyIpHeader || 'X-Forwarded-For';
    this.maxIpsCount = options.maxIpsCount || 0;
    this.env = options.env || process.env.NODE_ENV || 'development';
    if (options.keys) this.keys = options.keys;
    this.middleware = [];
    
    //this.context = new Context();
    //this.request = new Request();
    //this.response = new Response();

    //if (util.inspect.custom) {
      //this[util.inspect.custom] = this.inspect;
    //}
  }

  listen(...args: any[]) {
    debug('listen');
    const server = http.createServer(this.callback());
    return server.listen(...args);
  }

  toJSON() {
    return only(this, [
      'subdomainOffset',
      'proxy',
      'env'
    ]);
  }

  inspect() {
    return this.toJSON();
  }

  use(fn: Function) {
    if (typeof fn !== 'function') throw new TypeError('middleware must be a function!');
    if (isGeneratorFunction(fn)) {
      deprecate('Support for generators will be removed in v3. ' +
                'See the documentation for examples of how to convert old middleware ' +
                'https://github.com/koajs/koa/blob/master/docs/migration.md');
      fn = convert(fn);
    }
    debug('use %s', fn.name || '-');
    this.middleware.push(fn);
    return this;
  }

  callback() {
    const fn = compose(this.middleware);

    if (!this.listenerCount('error')) this.on('error', this.onerror);

    const handleRequest = (req: http.IncomingMessage, res: http.ServerResponse) => {
      const ctx = this.createContext(req, res);
      return this.handleRequest(ctx, fn);
    };

    return handleRequest;
  }

  handleRequest(ctx: Context, fnMiddleware: Function) {
    const res = ctx.res;
    res.statusCode = 404;
    const onerror = (err: any) => ctx.onerror(err);
    const handleResponse = () => respond(ctx);
    onFinished(res, onerror);
    return fnMiddleware(ctx).then(handleResponse).catch(onerror);
  }

  createContext(req: http.IncomingMessage, res: http.ServerResponse) {
    const context = new Context();
    const request = context.request = new Request();
    const response = context.response = new Response();
    context.app = request.app = response.app = this;
    context.req = request.req = response.req = req;
    context.res = request.res = response.res = res;
    request.ctx = response.ctx = context;
    request.response = response;
    response.request = request;
    context.originalUrl = request.originalUrl = req.url;
    context.state = {};
    return context;
  }

  onerror(err: Err) {
    if (!(err instanceof Error)) throw new TypeError(util.format('non-error thrown: %j', err));

    // not sure what err.expose is
    if (404 === err.status || err.expose) return;
    if (this.silent) return;

    const msg = err.stack || err.toString();
    console.error();
    console.error(msg.replace(/^/gm, '  '));
    console.error();
  }
}

function respond(ctx: Context) {
  // allow bypassing koa
  if (false === ctx.respond) return;

  if (!ctx.writable) return;

  const res = ctx.res;
  let body = ctx.body;
  const code = ctx.status;

  // ignore body
  if (statuses.empty[code]) {
    // strip headers
    ctx.body = null;
    return res.end();
  }

  if ('HEAD' === ctx.method) {
    if (!res.headersSent && !ctx.response.has('Content-Length')) {
      const { length } = ctx.response;
      if (Number.isInteger(length)) ctx.length = length;
    }
    return res.end();
  }

  // status body
  if (null == body) {
    if (ctx.response._explicitNullBody) {
      ctx.response.remove('Content-Type');
      ctx.response.remove('Transfer-Encoding');
      return res.end();
    }
    if (ctx.req.httpVersionMajor >= 2) {
      body = String(code);
    } else {
      body = ctx.message || String(code);
    }
    if (!res.headersSent) {
      ctx.type = 'text';
      ctx.length = Buffer.byteLength(body);
    }
    return res.end(body);
  }

  // responses
  if (Buffer.isBuffer(body)) return res.end(body);
  if ('string' === typeof body) return res.end(body);
  if (body instanceof Stream) return body.pipe(res);

  // body: json
  body = JSON.stringify(body);
  if (!res.headersSent) {
    ctx.length = Buffer.byteLength(body);
  }
  res.end(body);
}
