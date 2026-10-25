import { Hono } from 'hono';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import { sign, verify } from 'hono/jwt';
import { bodyLimit } from 'hono/body-limit';
import { createHash, timingSafeEqual } from 'node:crypto';
import { dirname, resolve, sep } from 'node:path';
import api from '../src/api';
import { CanvaClient, createCanvaAuthorization } from './canva-authorization';
import { createCreativeStudio } from './creative-studio';
import { db } from '../src/api/database';
import { clients, strategies, contentItems } from '../src/api/database/schema';
import { eq, desc } from 'drizzle-orm';
import { readFile } from 'node:fs/promises';

const cookieName='__Host-tzalam_session';
const sessionSeconds=12*60*60;
const hash=(value:string)=>createHash('sha256').update(value).digest();
const equal=(a:string,b:string)=>timingSafeEqual(hash(a),hash(b));
function loginPage(error=false){return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Iniciar sesión · TZALAM Command</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#f6f4ef;color:#163b36;font:16px system-ui,sans-serif}main{box-sizing:border-box;width:min(420px,92vw);padding:36px;background:white;border:1px solid #dfdfd7;border-radius:14px;box-shadow:0 12px 40px #163b3610}h1{font-size:26px;margin:0 0 8px}p{color:#626e67;line-height:1.5}label{display:grid;gap:8px;margin:20px 0;font-size:14px;font-weight:600}input,button{font:inherit;padding:12px;border-radius:7px;box-sizing:border-box;width:100%}input{border:1px solid #bbbfb8}input:focus{outline:2px solid #19766a}button{border:0;background:#163b36;color:white;cursor:pointer;font-weight:600}.error{color:#a32e27}</style></head><body><main><h1>TZALAM Command</h1><p>Acceso de propietario</p>${error?'<p class="error" role="alert">Usuario o contraseña incorrectos.</p>':''}<form action="/login" method="post"><label>Usuario<input name="username" autocomplete="username" required maxlength="200" autofocus></label><label>Contraseña<input name="password" type="password" autocomplete="current-password" required maxlength="1000"></label><button type="submit">Iniciar sesión</button></form></main></body></html>`;}

/** Browser-independent owner login, using Hono's signed JWT and cookie helpers. */
export function createProductionApp(username:string,password:string){
  if(!username||password.length<20)throw new Error('Configure OPERATOR_USERNAME and OPERATOR_PASSWORD (20+ characters) before starting production.');
  const app=new Hono();const dist=resolve(import.meta.dirname,'../dist');
  const sessionKey=createHash('sha256').update('tzalam-owner-session-v1:'+password).digest('hex');
  const canonicalOrigin=(requestUrl:string)=>new URL(process.env.RENDER_EXTERNAL_URL||process.env.WEBSITE_URL||requestUrl).origin;
  app.use('*',async(c,next)=>{await next();c.header('Cache-Control','private, no-store');c.header('X-Content-Type-Options','nosniff');c.header('Referrer-Policy',c.req.path.startsWith('/integraciones/canva')&&!['/integraciones/canva','/integraciones/canva/'].includes(c.req.path)?'no-referrer':'same-origin');c.header('Access-Control-Allow-Origin',undefined);c.header('Access-Control-Allow-Credentials',undefined);});
  // Same-origin checks include login and logout, before processing credentials.
  app.use('*',async(c,next)=>{
    if(!['GET','HEAD','OPTIONS'].includes(c.req.method)){
      const origin=c.req.header('origin');
      if((origin&&origin!==canonicalOrigin(c.req.url))||c.req.header('sec-fetch-site')==='cross-site')return c.text('Forbidden',403);
    }
    await next();
  });
  app.get('/healthz',c=>c.json({status:'ok'}));
  app.use('/login',bodyLimit({maxSize:4096}));
  app.get('/login',c=>c.html(loginPage()));
  app.post('/login',async c=>{
    const body=await c.req.parseBody();
    const validUser=equal(typeof body.username==='string'?body.username:'',username);
    const validPassword=equal(typeof body.password==='string'?body.password:'',password);
    if(!validUser||!validPassword)return c.html(loginPage(true),401);
    const now=Math.floor(Date.now()/1000);
    const token=await sign({sub:username,role:'owner',iss:'tzalam-command',iat:now,exp:now+sessionSeconds},sessionKey,'HS256');
    setCookie(c,cookieName,token,{path:'/',httpOnly:true,secure:true,sameSite:'Lax',maxAge:sessionSeconds});
    return c.redirect('/',303);
  });
  app.use('*',async(c,next)=>{
    const token=getCookie(c,cookieName);let authenticated=false;
    if(token){try{const claims=await verify(token,sessionKey,{alg:'HS256',iss:'tzalam-command'});authenticated=claims.sub===username&&claims.role==='owner'&&typeof claims.exp==='number';}catch{/* Invalid or expired sessions never grant access. */}}
    if(!authenticated){if(c.req.path.startsWith('/api/')||c.req.path.startsWith('/assets/'))return c.json({error:'UNAUTHORIZED'},401);return c.redirect('/login',303);}
    await next();
  });
  app.post('/logout',c=>{deleteCookie(c,cookieName,{path:'/',secure:true,httpOnly:true,sameSite:'Lax'});return c.redirect('/login',303);});
  const databaseUrl=process.env.DATABASE_URL||'';
  const canvaStorage=process.env.CANVA_STORAGE_DIR||(databaseUrl.startsWith('file:')?resolve(dirname(resolve(databaseUrl.slice(5))),'canva-authorization'):'');
  const canvaConfig={clientId:process.env.CANVA_CLIENT_ID||'',clientSecret:process.env.CANVA_CLIENT_SECRET||'',publicOrigin:process.env.RENDER_EXTERNAL_URL||process.env.WEBSITE_URL||'',storageDir:canvaStorage,ownerSession:(c:import('hono').Context)=>getCookie(c,cookieName)||''};
  const canva=new CanvaClient(canvaConfig);
  app.route('/integraciones/canva/estudio',createCreativeStudio({storageDir:canvaStorage,canva,brand:async()=>({name:'RUTA',ink:'#1F4D4A',paper:'#F7F4EF',accent:'#B89A63',confirmed:false,logo:'data:image/png;base64,'+(await readFile(resolve(import.meta.dirname,'../public/ruta-logo.png'))).toString('base64')}),context:async()=>{
    const all=await db.select().from(clients);const ruta=all.find(c=>c.name.toUpperCase().includes('RUTA'));
    if(!ruta)return {brief:'RUTA no está registrada en Client Hub.',strategy:'',brandNotes:''};
    const strategy=await db.select().from(strategies).where(eq(strategies.clientId,ruta.id)).orderBy(desc(strategies.id)).limit(1);
    const content=await db.select({id:contentItems.id,title:contentItems.title,caption:contentItems.caption,visualBrief:contentItems.visualBrief}).from(contentItems).where(eq(contentItems.clientId,ruta.id)).orderBy(desc(contentItems.id)).limit(4);
    return {clientId:ruta.id,brief:ruta.objective,brandNotes:JSON.stringify({voice:ruta.brandVoice,colors:ruta.brandColors,notes:ruta.brandNotes}),strategy:JSON.stringify(strategy[0]||{}),content};
  }}));
  app.route('/integraciones/canva',createCanvaAuthorization(canvaConfig,canva));
  app.all('/api/*',c=>api.fetch(c.req.raw));
  app.get('*',async c=>{
    let pathname:string;try{pathname=decodeURIComponent(new URL(c.req.url).pathname);}catch{return c.text('Bad request',400);}
    const path=resolve(dist,'.'+pathname);if(path!==dist&&!path.startsWith(dist+sep))return c.text('Not found',404);
    const asset=Bun.file(path);if(path!==dist&&await asset.exists())return new Response(asset,{headers:{'Content-Type':asset.type||'application/octet-stream'}});
    if(pathname.split('/').pop()?.includes('.'))return c.text('Not found',404);
    return new Response(Bun.file(resolve(dist,'index.html')),{headers:{'Content-Type':'text/html; charset=utf-8'}});
  });
  return app;
}
