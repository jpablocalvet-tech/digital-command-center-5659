import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createCanvaAuthorization, canvaScopes } from '../packages/web/deployment/canva-authorization';

const storage=await mkdtemp(join(tmpdir(),'tzalam-canva-verify-'));
let clock=Date.now(),calls=0,fail=false,omitScope=false;
let requestedChallenge='';
const access=crypto.randomUUID(),refresh=crypto.randomUUID(),clientSecret=crypto.randomUUID();
const config={clientId:'local-test-client',clientSecret,publicOrigin:'https://command.example',storageDir:storage,ownerSession:(c:any)=>c.req.header('x-test-owner')||'',now:()=>clock,
  fetchImpl:(async(url:any,init:any)=>{
    calls++;assert.equal(url,'https://api.canva.com/rest/v1/oauth/token');assert.equal(init.redirect,'error');
    assert.equal(init.headers.Authorization,'Basic '+Buffer.from('local-test-client:'+clientSecret).toString('base64'));
    const body=new URLSearchParams(init.body);assert.equal(body.get('grant_type'),'authorization_code');assert.equal(body.get('redirect_uri'),'https://command.example/integraciones/canva/callback');
    assert.equal(createHash('sha256').update(body.get('code_verifier')!).digest('base64url'),requestedChallenge);
    if(fail)return new Response('private Canva error must not appear in HTML',{status:400});
    return Response.json({access_token:access,refresh_token:refresh,token_type:'Bearer',expires_in:14400,...(omitScope?{}:{scope:canvaScopes.join(' ')})});
  }) as typeof fetch};
const headers={'x-test-owner':'owner-session-one'};
const app=createCanvaAuthorization(config);
const start=async()=>{
  const r=await app.request('https://command.example/connect',{method:'POST',headers});assert.equal(r.status,303);
  const url=new URL(r.headers.get('location')!);assert.equal(url.origin,'https://www.canva.com');assert.equal(url.pathname,'/api/oauth/authorize');assert.equal(url.searchParams.get('code_challenge_method'),'S256');assert.equal(url.searchParams.get('redirect_uri'),'https://command.example/integraciones/canva/callback');
  assert.equal(url.searchParams.get('scope'),canvaScopes.join(' '));assert.ok(!url.href.includes(clientSecret));requestedChallenge=url.searchParams.get('code_challenge')!;return url.searchParams.get('state')!;
};
try{
  assert.equal((await app.request('https://command.example/callback?state=forged&code=test',{headers})).status,400);assert.equal(calls,0);
  const state=await start();
  assert.equal((await app.request('https://command.example/callback?state='+state+'&code=test',{headers:{'x-test-owner':'other-session'}})).status,400);assert.equal(calls,0);
  assert.equal((await app.request('https://command.example/callback?state='+state+'&code=test',{headers})).status,303);assert.equal(calls,1);
  assert.equal((await app.request('https://command.example/callback?state='+state+'&code=test',{headers})).status,400);assert.equal(calls,1);
  const raw=await readFile(join(storage,'grant'));assert.ok(!raw.includes(Buffer.from(access)));assert.ok(!raw.includes(Buffer.from(refresh)));assert.equal((await stat(join(storage,'grant'))).mode&0o777,0o600);assert.equal((await stat(join(storage,'key'))).mode&0o777,0o600);
  const restarted=createCanvaAuthorization(config);const status=await restarted.request('https://command.example/',{headers});const html=await status.text();assert.match(html,/Autorización guardada/);for(const secret of [access,refresh,clientSecret])assert.ok(!html.includes(secret));assert.equal(status.headers.get('Referrer-Policy'),'no-referrer');
  const expired=await start();clock+=11*60*1000;assert.equal((await app.request('https://command.example/callback?state='+expired+'&code=test',{headers})).status,400);assert.equal(calls,1);
  const denied=await start();assert.equal((await app.request('https://command.example/callback?state='+denied+'&error=access_denied',{headers})).status,400);assert.equal(calls,1);
  fail=true;const failing=await start();const rejected=await app.request('https://command.example/callback?state='+failing+'&code=test',{headers});assert.equal(rejected.status,502);assert.ok(!(await rejected.text()).includes('private Canva error'));assert.deepEqual(await readFile(join(storage,'grant')),raw);
  fail=false;omitScope=true;const optional=await start();assert.equal((await app.request('https://command.example/callback?state='+optional+'&code=test',{headers})).status,303);
  const unconfigured=createCanvaAuthorization({...config,clientSecret:''});assert.match(await (await unconfigured.request('https://command.example/')).text(),/pendiente de configuración/);assert.equal((await unconfigured.request('https://command.example/connect',{method:'POST',headers})).status,503);
  console.log(JSON.stringify({pass:true,checks:['PKCE S256 and exact redirect','state bound to owner session','expiry and single use','server-only exchange','encrypted persistent grants and private permissions','no secrets in HTML','failed authorization preserves existing grant','missing credentials fail closed','no design or workspace API calls']}));
}finally{await rm(storage,{recursive:true,force:true});}
