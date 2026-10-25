import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(new URL('../packages/web/package.json',import.meta.url));
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
const restart=process.argv.includes('--restart');
const tmp=restart?'':await mkdtemp(resolve(tmpdir(),'tzalam-verify-'));
if(!restart){process.env.DATABASE_URL='file:'+resolve(tmp,'command.db');process.env.OPERATOR_USERNAME='local-owner';process.env.OPERATOR_PASSWORD=crypto.randomUUID()+crypto.randomUUID();}
const {db}=await import('../packages/web/src/api/database');
const schema=await import('../packages/web/src/api/database/schema');
const {migrate}=await import('../packages/web/node_modules/drizzle-orm/libsql/migrator');
const {bootstrap}=await import('../packages/web/deployment/bootstrap');
const {createProductionApp}=await import('../packages/web/deployment/app');
const {createORPCClient}=await import(require.resolve('@orpc/client'));
const {RPCLink}=await import(require.resolve('@orpc/client/fetch'));
await migrate(db,{migrationsFolder:'drizzle'});await bootstrap();
const app=createProductionApp(process.env.OPERATOR_USERNAME!,process.env.OPERATOR_PASSWORD!);
const login=await app.request('https://command.example/login',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded',Origin:'https://command.example'},body:new URLSearchParams({username:process.env.OPERATOR_USERNAME!,password:process.env.OPERATOR_PASSWORD!}).toString()});
assert.equal(login.status,303);const setCookie=login.headers.get('Set-Cookie')!;
assert.match(setCookie,/HttpOnly/);assert.match(setCookie,/Secure/);assert.match(setCookie,/SameSite=Lax/);const auth=setCookie.split(';')[0];
const rpc=createORPCClient<any>(new RPCLink({url:'https://command.example/api/rpc',fetch:async(request:Request)=>app.request(request.url,{method:request.method,headers:{...Object.fromEntries(request.headers),Cookie:auth},body:['GET','HEAD'].includes(request.method)?undefined:await request.text()})}));
try{
  if(restart){const rows=await rpc.pipeline.list();assert.equal(rows.find((r:any)=>r.business==='PRUEBA LOCAL EFÍMERA').state,'Ganado');assert.equal((await rpc.strategy.get({clientId:1,cycleId:1})).audience,'QA persistencia estrategia');console.log('Restart persistence passed');}
  else {
    assert.throws(()=>createProductionApp('',''));
    assert.equal((await app.request('https://command.example/healthz')).status,200);
    const loginPage=await app.request('https://command.example/login');assert.equal(loginPage.status,200);assert.match(await loginPage.text(),/Iniciar sesión/);
    for(const path of ['/','/pipeline','/integraciones/canva','/integraciones/canva/estudio','/integraciones/canva/estudio/pieces','/integraciones/canva/callback?state=forged&code=test']){const r=await app.request('https://command.example'+path);assert.equal(r.status,303);assert.equal(r.headers.get('Location'),'/login');assert.equal(r.headers.get('WWW-Authenticate'),null);}
    for(const path of ['/api/rpc/pipeline/list','/assets/missing.js'])assert.equal((await app.request('https://command.example'+path)).status,401);
    const wrong=await app.request('https://command.example/login',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:'username=bad&password=bad'});assert.equal(wrong.status,401);assert.equal(wrong.headers.get('Set-Cookie'),null);
    assert.equal((await app.request('https://command.example/',{headers:{Cookie:auth}})).status,200);
    const canvaSetup=await app.request('https://command.example/integraciones/canva',{headers:{Cookie:auth}});assert.equal(canvaSetup.status,200);assert.match(await canvaSetup.text(),/Autorización pendiente de configuración/);assert.equal(canvaSetup.headers.get('Referrer-Policy'),'same-origin');
    const studio=await app.request('https://command.example/integraciones/canva/estudio',{headers:{Cookie:auth}});assert.equal(studio.status,200);assert.match(await studio.text(),/Estudio RUTA/);assert.equal(studio.headers.get('Referrer-Policy'),'no-referrer');
    assert.equal((await app.request('https://command.example/integraciones/canva/estudio/pilot',{method:'POST',headers:{Cookie:auth,Origin:'https://attacker.invalid','Content-Type':'application/json'},body:'{}'})).status,403);
    assert.equal((await app.request('https://command.example/integraciones/canva/connect',{method:'POST',headers:{Cookie:auth,Origin:'https://other.example'}})).status,403);
    assert.equal((await app.request('https://command.example/integraciones/canva/callback?state=forged&code=test',{headers:{Cookie:auth}})).status,400);
    const html=await (await app.request('https://command.example/',{headers:{Cookie:auth}})).text();
    const assetPaths=[...html.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)].map(m=>m[1]);assert.ok(assetPaths.length>=2);
    for(const assetPath of assetPaths){const response=await app.request('https://command.example'+assetPath,{headers:{Cookie:auth}});assert.equal(response.status,200);assert.match(response.headers.get('Content-Type')||'',assetPath.endsWith('.js')?/javascript/:/text\/css/);assert.ok((await response.arrayBuffer()).byteLength>0);}
    assert.equal((await app.request('https://command.example/api/rpc/pipeline/list',{headers:{Cookie:auth+'corrupted'}})).status,401);
    const csrf=await app.request('https://command.example/api/rpc/pipeline/create',{method:'POST',headers:{Cookie:auth,Origin:'https://other.example'}});assert.equal(csrf.status,403);
    assert.equal((await app.request('https://command.example/login',{method:'POST',headers:{Origin:'https://other.example'}})).status,403);
    process.env.RENDER_EXTERNAL_URL='https://command.example';
    const proxyLogin=await app.request('http://internal-render:10000/login',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded',Origin:'https://command.example'},body:new URLSearchParams({username:process.env.OPERATOR_USERNAME!,password:process.env.OPERATOR_PASSWORD!}).toString()});assert.equal(proxyLogin.status,303);
    const logout=await app.request('https://command.example/logout',{method:'POST',headers:{Cookie:auth,Origin:'https://command.example'}});assert.equal(logout.status,303);assert.match(logout.headers.get('Set-Cookie')!,/Max-Age=0/);
    await bootstrap();let rows=await rpc.pipeline.list();assert.equal(rows.length,2);assert.equal(rows.find((r:any)=>r.business==='Administración Residencial').estimatedValue,14900);assert.equal(rows.find((r:any)=>r.business==='CASEM').estimatedValue,null);
    const draft={business:'PRUEBA LOCAL EFÍMERA',segment:'QA',location:'',contact:'',fit:'',priority:'Media',score:null,offer:'',estimatedValue:5000,monthlyRevenue:1000,state:'Prospecto',lastContact:'',nextAction:'Comprobar guardado',followUpDate:'2026-10-21',notes:''};
    const row=await rpc.pipeline.create(draft);await rpc.pipeline.update({...draft,id:row.id,state:'Ganado'});
    await assert.rejects(()=>rpc.pipeline.create({...draft,score:101}));await assert.rejects(()=>rpc.pipeline.create({...draft,followUpDate:'2026-02-31'}));
    assert.equal((await rpc.clients.list()).length,1);
    const firstStrategy=await rpc.strategy.get({clientId:1,cycleId:1});
    const savedStrategy={objective:firstStrategy.objective,audience:'QA persistencia estrategia',problems:'',valueProp:'',competitors:'',pillars:'',channels:'',mainCta:''};
    await rpc.strategy.update({clientId:1,cycleId:1,values:savedStrategy});
    const [legacyCycle]=await db.insert(schema.contentCycles).values({clientId:1,name:'QA ciclo legado sin estrategia',startDate:'2026-10-01',endDate:'2026-10-31',objective:'Objetivo persistido',status:'Planificado'}).returning();
    await assert.rejects(()=>rpc.strategy.get({clientId:1,cycleId:legacyCycle.id}),/Estrategia no encontrada/);
    const repair=await bootstrap();assert.equal(repair.strategiesInitialized,1);
    assert.equal((await rpc.strategy.get({clientId:1,cycleId:legacyCycle.id})).objective,'Objetivo persistido');
    assert.equal((await rpc.strategy.get({clientId:1,cycleId:1})).audience,'QA persistencia estrategia');
    assert.equal((await bootstrap()).strategiesInitialized,0);
    assert.equal((await db.select().from(schema.strategies)).length,2);

    const child=Bun.spawn([process.execPath,'scripts/verify-render.ts','--restart'],{env:process.env,stdout:'inherit',stderr:'inherit'});assert.equal(await child.exited,0);
    console.log(JSON.stringify({pass:true,checks:['HTML owner login and secure session','anonymous HTML/API/assets denied','wrong password denied','dashboard loads','cross-origin write denied','two real seeds without duplicates','create and edit','validation','persistent records after process restart','missing legacy strategy repaired without overwriting saved strategy']}));
  }
}finally{if(!restart)await rm(tmp,{recursive:true,force:true});}
