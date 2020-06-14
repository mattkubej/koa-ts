import Koa from '../../application';
import Context from '../../context';
import net from 'net';
import http from 'http';

describe('res.writable', () => {
  describe('when continuous requests in one persistent connection', () => {
    function requestTwice(server: http.Server, done: any) {
      const port = (server.address() as net.AddressInfo).port;
      const buf = Buffer.from('GET / HTTP/1.1\r\nHost: localhost:' + port + '\r\nConnection: keep-alive\r\n\r\n');
      const client = net.connect(port);
      const datas = [];
      client
        .on('error', done)
        .on('data', data => datas.push(data))
        .on('end', () => done(null, datas));
      setImmediate(() => client.write(buf));
      setImmediate(() => client.write(buf));
      setTimeout(() => client.end(), 100);
    }

    it('should always writable and response all requests', () => {
      return new Promise(resolve => {
        const app = new Koa();
        let count = 0;
        app.use((ctx: Context) => {
          count++;
          ctx.body = 'request ' + count + ', writable: ' + ctx.writable;
        });

        const server = app.listen();
        requestTwice(server, (_: any, datas: Uint8Array[]) => {
          const responses = Buffer.concat(datas).toString();
          expect(/request 1, writable: true/.test(responses)).toBeTruthy();
          expect(/request 2, writable: true/.test(responses)).toBeTruthy();
          resolve();
        });
      });
    });
  });

  describe('when socket closed before response sent', () => {
    function requestClosed(server: http.Server) {
      const port = (server.address() as net.AddressInfo).port;
      const buf = Buffer.from('GET / HTTP/1.1\r\nHost: localhost:' + port + '\r\nConnection: keep-alive\r\n\r\n');
      const client = net.connect(port);
      setImmediate(() => {
        client.write(buf);
        client.end();
      });
    }

    it('should not writable', () => {
      return expect(new Promise(resolve => {
        const app = new Koa();
        app.use((ctx: Context) => {
          sleep(1000)
            .then(() => {
              if (ctx.writable) return resolve(new Error('ctx.writable should not be true'));
              resolve('pass');
            });
        });
        const server = app.listen();
        requestClosed(server);
      })).resolves.toBe('pass');
    });
  });

  describe('when response finished', () => {
    function request(server: http.Server) {
      const port = (server.address() as net.AddressInfo).port;
      const buf = Buffer.from('GET / HTTP/1.1\r\nHost: localhost:' + port + '\r\nConnection: keep-alive\r\n\r\n');
      const client = net.connect(port);
      setImmediate(() => {
        client.write(buf);
      });
      setTimeout(() => {
        client.end();
      }, 100);
    }

    it('should not writable', () => {
      return expect(new Promise(resolve => {
        const app = new Koa();
        app.use((ctx: Context) => {
          ctx.res.end();
          if (ctx.writable) return resolve(new Error('ctx.writable should not be true'));
          resolve('pass');
        });
        const server = app.listen();
        request(server);
      })).resolves.toBe('pass');
    });
  });
});

function sleep(time: number) {
  return new Promise(resolve => setTimeout(resolve, time));
}
