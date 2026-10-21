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
const {migrate}=await import('../packages/web/node_modules/drizzle-orm/libsql/migrator');
const {bootstrap}=await import('../packages/web/deployment/bootstrap');
const {createProductionApp}=await import('../packages/web/deployment/app');
const {createORPCClient}=await import(require.resolve('@orpc/client'));
const {RPCLink}=await import(require.resolve('@orpc/client/fetch'));
await migrate(db,{migrationsFolder:'drizzle'});await bootstrap();
const app=createProductionApp(process.env.OPERATOR_USERNAME!,process.env.OPERATOR_PASSWORD!);
const auth='Basic '+btoa(process.env.OPERATOR_USERNAME+':'+process.env.OPERATOR_PASSWORD);
const rpc=createORPCClient<any>(new RPCLink({url:'https://command.example/api/rpc',fetch:async(request:Request)=>app.request(request.url,{method:request.method,headers:{...Object.fromEntries(request.headers),Authorization:auth},body:['GET','HEAD'].includes(request.method)?undefined:await request.text()})}));
try{
  if(restart){const rows=await rpc.pipeline.list();assert.equal(rows.find((r:any)=>r.business==='PRUEBA LOCAL EFÍMERA').state,'Ganado');console.log('Restart persistence passed');}
  else {
    assert.throws(()=>createProductionApp('',''));
    assert.equal((await app.request('https://command.example/healthz')).status,200);
    for(const path of ['/','/pipeline','/api/rpc/pipeline/list','/assets/missing.js']){const r=await app.request('https://command.example'+path);assert.equal(r.status,401);assert.match(r.headers.get('WWW-Authenticate')!,/Basic/);}
    assert.equal((await app.request('https://command.example/',{headers:{Authorization:'Basic '+btoa('bad:bad')}})).status,401);
    assert.equal((await app.request('https://command.example/',{headers:{Authorization:auth}})).status,200);
    const csrf=await app.request('https://command.example/api/rpc/pipeline/create',{method:'POST',headers:{Authorization:auth,Origin:'https://other.example'}});assert.equal(csrf.status,403);
    await bootstrap();let rows=await rpc.pipeline.list();assert.equal(rows.length,2);assert.equal(rows.find((r:any)=>r.business==='Administración Residencial').estimatedValue,14900);assert.equal(rows.find((r:any)=>r.business==='CASEM').estimatedValue,null);
    const draft={business:'PRUEBA LOCAL EFÍMERA',segment:'QA',location:'',contact:'',fit:'',priority:'Media',score:null,offer:'',estimatedValue:5000,monthlyRevenue:1000,state:'Prospecto',lastContact:'',nextAction:'Comprobar guardado',followUpDate:'2026-10-21',notes:''};
    const row=await rpc.pipeline.create(draft);await rpc.pipeline.update({...draft,id:row.id,state:'Ganado'});
    await assert.rejects(()=>rpc.pipeline.create({...draft,score:101}));await assert.rejects(()=>rpc.pipeline.create({...draft,followUpDate:'2026-02-31'}));
    assert.equal((await rpc.clients.list()).length,1);
    const child=Bun.spawn([process.execPath,'scripts/verify-render.ts','--restart'],{env:process.env,stdout:'inherit',stderr:'inherit'});assert.equal(await child.exited,0);
    console.log(JSON.stringify({pass:true,checks:['native owner login','anonymous HTML/API/assets denied','wrong password denied','dashboard loads','cross-origin write denied','two real seeds without duplicates','create and edit','validation','persistent records after process restart']}));
  }
}finally{if(!restart)await rm(tmp,{recursive:true,force:true});}
