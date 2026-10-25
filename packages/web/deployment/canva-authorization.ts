import { Hono } from 'hono';
import type { Context } from 'hono';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { mkdir, open, readFile, rename, unlink } from 'node:fs/promises';
import { join } from 'node:path';

// Grants never leave the server. Production API calls share one refresh lock.
export const canvaScopes = ['profile:read','design:meta:read','design:content:read','design:content:write','asset:read','asset:write','brandtemplate:meta:read','brandtemplate:content:read'];
const escapeHtml = (value:string) => value.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
export type CanvaConfig = {clientId:string;clientSecret:string;publicOrigin:string;storageDir:string;ownerSession:(c:Context)=>string;fetchImpl?:typeof fetch;now?:()=>number};
type Grant = {access_token:string;refresh_token:string;token_type:string;expires_in:number;scope:string;connectedAt:number};

/** Encrypt grants at rest. The private key and ciphertext stay on the persistent disk. */
class GrantStore {
  constructor(private dir:string){}
  private async key(create:boolean){
    const path=join(this.dir,'key');
    if(create){
      await mkdir(this.dir,{recursive:true,mode:0o700});
      try{const file=await open(path,'wx',0o600);try{await file.writeFile(randomBytes(32));}finally{await file.close();}}
      catch(error){if((error as NodeJS.ErrnoException).code!=='EEXIST')throw error;}
    }
    const key=await readFile(path);if(key.length!==32)throw new Error('Invalid Canva storage key');return key;
  }
  async read():Promise<Grant|null>{
    let raw:Buffer;try{raw=await readFile(join(this.dir,'grant'));}catch(error){if((error as NodeJS.ErrnoException).code==='ENOENT')return null;throw error;}
    if(raw.length<29||raw[0]!==1)throw new Error('Invalid Canva grant file');
    const decipher=createDecipheriv('aes-256-gcm',await this.key(false),raw.subarray(1,13));decipher.setAuthTag(raw.subarray(13,29));
    return JSON.parse(Buffer.concat([decipher.update(raw.subarray(29)),decipher.final()]).toString('utf8')) as Grant;
  }
  async write(grant:Grant){
    const key=await this.key(true),iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key,iv);
    const encrypted=Buffer.concat([cipher.update(JSON.stringify(grant),'utf8'),cipher.final()]);
    const tmp=join(this.dir,`grant-${randomBytes(8).toString('hex')}.tmp`);
    try{const file=await open(tmp,'wx',0o600);try{await file.writeFile(Buffer.concat([Buffer.from([1]),iv,cipher.getAuthTag(),encrypted]));await file.sync();}finally{await file.close();}await rename(tmp,join(this.dir,'grant'));}
    finally{await unlink(tmp).catch(()=>{});}
  }
}

export class CanvaClient {
  private queue: Promise<unknown> = Promise.resolve();
  private store: GrantStore;
  constructor(private config: CanvaConfig) { this.store = new GrantStore(config.storageDir); }
  private exclusive<T>(fn:()=>Promise<T>):Promise<T> {
    const result=this.queue.then(fn);this.queue=result.catch(()=>{});return result;
  }
  save(grant:Grant) { return this.exclusive(()=>this.store.write(grant)); }
  private token(force=false):Promise<string> { return this.exclusive(async()=>{
    if(!this.config.storageDir||!this.config.clientId||!this.config.clientSecret)throw new Error('CANVA_NOT_CONFIGURED');
    const grant=await this.store.read();if(!grant)throw new Error('CANVA_CONNECT_REQUIRED');
    const now=(this.config.now||Date.now)();
    if(!force&&grant.connectedAt+grant.expires_in*1000>now+90000)return grant.access_token;
    const response=await (this.config.fetchImpl||fetch)('https://api.canva.com/rest/v1/oauth/token',{method:'POST',redirect:'error',signal:AbortSignal.timeout(15000),headers:{Authorization:'Basic '+Buffer.from(this.config.clientId+':'+this.config.clientSecret).toString('base64'),'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'refresh_token',refresh_token:grant.refresh_token})});
    if(!response.ok)throw new Error(response.status===400||response.status===401?'CANVA_RECONNECT_REQUIRED':'CANVA_TEMPORARILY_UNAVAILABLE');
    const next=await response.json() as Grant;
    if(!next.access_token||!next.refresh_token||next.token_type?.toLowerCase()!=='bearer'||!Number.isFinite(next.expires_in)||next.expires_in<=0)throw new Error('CANVA_INVALID_RESPONSE');
    await this.store.write({...next,scope:next.scope??grant.scope,connectedAt:now});return next.access_token;
  }); }
  async request(path:string,init:RequestInit={}) {
    if(!/^\/[a-z0-9/?=&_-]+$/i.test(path))throw new Error('CANVA_INVALID_PATH');
    let token=await this.token();
    const send=()=>{const headers=new Headers(init.headers);headers.set('Authorization','Bearer '+token);return (this.config.fetchImpl||fetch)('https://api.canva.com/rest/v1'+path,{...init,headers,redirect:'error',signal:AbortSignal.timeout(20000)});};
    let response=await send();
    // Retry reads only: a mutation may have succeeded before its response failed.
    if(response.status===401&&(!init.method||init.method==='GET')){token=await this.token(true);response=await send();}
    if(!response.ok)throw new Error(response.status===401?'CANVA_RECONNECT_REQUIRED':response.status===403?'CANVA_PERMISSION_REQUIRED':response.status===429?'CANVA_RATE_LIMITED':'CANVA_REQUEST_FAILED');
    return response.json();
  }
}

export function createCanvaAuthorization(config:CanvaConfig,client=new CanvaClient(config)){
  const app=new Hono(),now=config.now||Date.now,request=config.fetchImpl||fetch,store=new GrantStore(config.storageDir);
  const pending=new Map<string,{verifier:string;owner:string;expires:number}>();
  const owner=(c:Context)=>createHash('sha256').update(config.ownerSession(c)).digest('hex');
  const configured=Boolean(config.clientId&&config.clientSecret&&config.publicOrigin&&config.storageDir);
  const callback=config.publicOrigin?new URL('/integraciones/canva/callback',config.publicOrigin).href:'';
  const page=(message:string,connected=false)=>`<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Canva · TZALAM Command</title><style>body{background:#f6f4ef;color:#163b36;font:16px system-ui;line-height:1.6;margin:0}main{max-width:700px;margin:6vh auto;padding:28px;background:white;border:1px solid #ddd;border-radius:12px}button{background:#163b36;color:white;border:0;border-radius:6px;padding:12px 20px;font:inherit;cursor:pointer}code{overflow-wrap:anywhere}a{color:#163b36}</style></head><body><main><h1>Canva · TZALAM</h1><p role="status">${escapeHtml(message)}</p><p>Cuenta prevista: tu Canva Pro personal, en el espacio que contiene las plantillas y el kit de marca TZALAM.</p><p>Si Canva muestra varios espacios, detente antes de elegir: hay que identificar el que ya contiene TZALAM.</p>${configured&&!connected?'<form method="post" action="/integraciones/canva/connect"><button>Revisar autorización en Canva</button></form>':''}${!configured?`<p>Falta registrar la integración oficial y configurar sus credenciales en Render.</p><p>URL de retorno prevista: <code>${escapeHtml(callback||'Pendiente de configurar URL pública')}</code></p>`:''}<p>Esta etapa solo guarda la autorización. No crea equipos, no duplica archivos, no lee plantillas ni genera o publica piezas.</p><p><a href="/">Volver al Command</a></p></main></body></html>`;
  app.use('*',async(c,next)=>{await next();c.header('Referrer-Policy','no-referrer');c.header('Cache-Control','private, no-store');});
  app.get('/',async c=>{
    if(!configured)return c.html(page('Autorización pendiente de configuración.'));
    try{const grant=await store.read();return c.html(page(grant?'Autorización guardada; comprueba la conexión vigente en el estudio de producción.':configured?'Listo para que revises la autorización de Canva.':'Autorización pendiente de configuración.',Boolean(grant)).replace('<p>Esta etapa solo guarda', '<p><a href="/integraciones/canva/estudio">Abrir estudio de producción</a></p><p>Esta página solo guarda'));}
    catch{return c.html(page('No se pudo verificar la autorización guardada. No se ha reemplazado ni eliminado.'),503);}
  });
  app.post('/connect',c=>{
    if(!configured)return c.html(page('Autorización pendiente de configuración.'),503);
    if(new URL(config.publicOrigin).protocol!=='https:')return c.html(page('La autorización requiere una URL HTTPS de producción.'),503);
    for(const [state,value] of pending)if(value.expires<=now())pending.delete(state);
    if(pending.size>=20)return c.html(page('Hay demasiadas autorizaciones pendientes. Espera unos minutos.'),429);
    const state=randomBytes(32).toString('base64url'),verifier=randomBytes(64).toString('base64url');
    pending.set(state,{verifier,owner:owner(c),expires:now()+10*60*1000});
    const url=new URL('https://www.canva.com/api/oauth/authorize');
    url.search=new URLSearchParams({client_id:config.clientId,response_type:'code',code_challenge_method:'S256',code_challenge:createHash('sha256').update(verifier).digest('base64url'),state,scope:canvaScopes.join(' '),redirect_uri:callback}).toString();
    return c.redirect(url.href,303);
  });
  app.get('/callback',async c=>{
    const state=c.req.query('state')||'',attempt=pending.get(state);
    if(!attempt||attempt.owner!==owner(c)||attempt.expires<=now())return c.html(page('La autorización caducó o no pertenece a esta sesión. Vuelve al Command e iníciala de nuevo.'),400);
    pending.delete(state);
    if(c.req.query('error')||!c.req.query('code'))return c.html(page('Canva no concedió la autorización. No se ha cambiado ninguna conexión existente.'),400);
    try{
      const response=await request('https://api.canva.com/rest/v1/oauth/token',{method:'POST',redirect:'error',signal:AbortSignal.timeout(15000),headers:{Authorization:'Basic '+Buffer.from(config.clientId+':'+config.clientSecret).toString('base64'),'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'authorization_code',code:c.req.query('code')!,code_verifier:attempt.verifier,redirect_uri:callback})});
      if(!response.ok)throw new Error('Canva rejected token exchange');
      const grant=await response.json() as Grant;
      if(typeof grant.access_token!=='string'||!grant.access_token||typeof grant.refresh_token!=='string'||!grant.refresh_token||grant.token_type?.toLowerCase()!=='bearer'||!Number.isFinite(grant.expires_in)||grant.expires_in<=0)throw new Error('Invalid token response');
      // OAuth permits omitting scope when it is identical to the requested set.
      if(grant.scope===undefined)grant.scope=canvaScopes.join(' ');
      if(typeof grant.scope!=='string')throw new Error('Invalid scope response');
      const granted=new Set(grant.scope.split(' '));if(canvaScopes.some(scope=>!granted.has(scope)))throw new Error('Missing scopes');
      await client.save({access_token:grant.access_token,refresh_token:grant.refresh_token,token_type:grant.token_type,expires_in:grant.expires_in,scope:grant.scope,connectedAt:now()});
      return c.redirect('/integraciones/canva',303);
    }catch{return c.html(page('No se pudo completar la autorización con Canva. No se muestran secretos ni se ha cambiado la conexión anterior.'),502);}
  });
  return app;
}
