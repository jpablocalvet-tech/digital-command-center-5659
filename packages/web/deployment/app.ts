import { Hono } from 'hono';
import { basicAuth } from 'hono/basic-auth';
import { resolve, sep } from 'node:path';
import api from '../src/api';

/** Uses Hono's built-in HTTP Basic authentication over Render HTTPS. */
export function createProductionApp(username: string, password: string) {
  if (!username || password.length < 20) throw new Error('Configure OPERATOR_USERNAME and OPERATOR_PASSWORD (20+ characters) before starting production.');
  const app = new Hono();
  const dist = resolve(import.meta.dirname, '../dist');
  app.use('*', async (c, next) => {
    await next();
    c.header('Cache-Control', 'private, no-store');
    c.header('X-Content-Type-Options', 'nosniff');
    c.header('Referrer-Policy', 'same-origin');
    c.header('Access-Control-Allow-Origin', undefined);
    c.header('Access-Control-Allow-Credentials', undefined);
  });
  // Health reveals no records and is the only public endpoint.
  app.get('/healthz', c => c.json({status:'ok'}));
  app.use('*', basicAuth({username, password, realm:'TZALAM Command - Propietario',invalidUserMessage:'Inicia sesión como propietario para acceder a TZALAM Command.'}));
  app.use('*', async (c, next) => {
    if (!['GET','HEAD','OPTIONS'].includes(c.req.method)) {
      const origin=c.req.header('origin');
      if ((origin && origin !== new URL(c.req.url).origin) || c.req.header('sec-fetch-site') === 'cross-site') return c.text('Forbidden',403);
    }
    await next();
  });
  app.all('/api/*', c => api.fetch(c.req.raw));
  app.get('*', async c => {
    let pathname: string;
    try { pathname=decodeURIComponent(new URL(c.req.url).pathname); } catch { return c.text('Bad request',400); }
    const path=resolve(dist,'.'+pathname);
    if (path!==dist && !path.startsWith(dist+sep)) return c.text('Not found',404);
    const asset=Bun.file(path);
    if(path!==dist && await asset.exists()) return new Response(asset);
    if (pathname.split('/').pop()?.includes('.')) return c.text('Not found',404);
    return new Response(Bun.file(resolve(dist,'index.html')), {headers:{'Content-Type':'text/html; charset=utf-8'}});
  });
  return app;
}
