import assert from 'node:assert/strict';
import { mkdtemp,rm,readFile,mkdir,writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join,resolve } from 'node:path';
import sharp from '../packages/web/node_modules/sharp';
import { CanvaClient } from '../packages/web/deployment/canva-authorization';
import { createCreativeStudio } from '../packages/web/deployment/creative-studio';

const dir=await mkdtemp(join(tmpdir(),'tzalam-studio-'));
let now=Date.now(),refreshes=0,mutations=0,exportPng:Buffer,failRefresh=false,failSync=false;
const access=crypto.randomUUID(),refresh=crypto.randomUUID(),secret=crypto.randomUUID();
const canva=new CanvaClient({clientId:'test',clientSecret:secret,publicOrigin:'https://command.example',storageDir:dir,ownerSession:()=>'',now:()=>now,
  fetchImpl:(async(url:string,init:RequestInit)=>{
    if(url.endsWith('/oauth/token')){refreshes++;assert.equal(new URLSearchParams(init.body as string).get('grant_type'),'refresh_token');if(failRefresh)return new Response('',{status:400});return Response.json({access_token:access,refresh_token:refresh,token_type:'Bearer',expires_in:14400});}
    assert.equal(new Headers(init.headers).get('Authorization'),'Bearer '+access);
    if(url.endsWith('/users/me/capabilities'))return Response.json({capabilities:[]});
    if(init.method==='POST'){mutations++;if(failSync)throw Error('network interrupted after mutation');}
    if(url.endsWith('/asset-uploads'))return Response.json({job:{id:'upload-one',status:'in_progress'}});
    if(url.endsWith('/asset-uploads/upload-one'))return Response.json({job:{status:'success',asset:{id:'asset-one'}}});
    if(url.endsWith('/designs')){const body=JSON.parse(init.body as string);assert.equal(body.asset_id,'asset-one');return Response.json({design:{id:'design-one'}});}
    if(url.endsWith('/exports'))return Response.json({job:{id:'export-one'}});
    if(url.endsWith('/exports/export-one'))return Response.json({job:{status:'success',urls:['https://export.canva.com/test.png']}});
    throw Error('Unexpected URL');
  }) as typeof fetch});
const config={storageDir:dir,canva,context:async()=>({brief:'RUTA test',strategy:'Local fixture',brandNotes:'Test only'}),fetchImpl:(async()=>new Response(new Uint8Array(exportPng))) as typeof fetch};
let app=createCreativeStudio(config);
const post=(path:string,data:unknown={})=>app.request('https://command.example'+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
try{
  await canva.save({access_token:access,refresh_token:refresh,token_type:'Bearer',expires_in:1,scope:'profile:read',connectedAt:now-2000});
  const connection=await Promise.all([post('/connection'),post('/connection'),post('/connection')]);assert.ok(connection.every(r=>r.status===200));assert.equal(refreshes,1,'Concurrent requests share refresh');
  const statusText=await (await post('/connection')).text();for(const s of [access,refresh,secret])assert.ok(!statusText.includes(s));
  const started=performance.now();const batch=await post('/pilot',{brief:'Diseño de viajes a medida',strategy:'Educar sin prometer disponibilidad'});assert.equal(batch.status,200);const {pieces}=await batch.json();assert.equal(pieces.length,4);
  const output=resolve('../../outputs/ruta-prueba-local');await mkdir(output,{recursive:true});
  for(const p of pieces){const image=await app.request('https://command.example/'+p.id+'/preview.png');const bytes=Buffer.from(await image.arrayBuffer());const meta=await sharp(bytes).metadata();assert.equal(meta.width,1080);assert.equal(meta.height,p.index>=2?1920:1350);await writeFile(join(output,`RUTA-${p.index+1}-prueba.png`),bytes);await writeFile(join(output,`RUTA-${p.index+1}-texto.txt`),p.copy.caption);assert.equal((await post('/'+p.id+'/decision',{hash:p.hash,decision:'approved'})).status,400);}
  const p=pieces[0];assert.equal((await post('/'+p.id+'/canva',{hash:p.hash})).status,400);assert.equal(mutations,0);
  assert.equal((await post('/'+p.id+'/revise',{hash:p.hash,note:'Sin cambio',copy:p.copy})).status,400);
  // A synthetic logo exists only in this temporary test. It never represents RUTA.
  const logo='data:image/png;base64,'+(await sharp({create:{width:80,height:40,channels:4,background:'#173e36'}}).png().toBuffer()).toString('base64');
  const rev=await post('/'+p.id+'/revise',{hash:p.hash,note:'Marca sintética, solo QA',logo,brandConfirmed:true});assert.equal(rev.status,200);let next=await rev.json();assert.equal(next.revision,2);assert.equal(next.state,'review');
  assert.equal((await post('/'+next.id+'/decision',{hash:p.hash,decision:'approved'})).status,400);
  assert.equal((await post('/'+next.id+'/decision',{hash:next.hash,decision:'approved'})).status,200);
  exportPng=Buffer.from(await (await app.request('https://command.example/'+next.id+'/preview.png')).arrayBuffer());
  for(let i=0;i<5;i++){const r=await post('/'+next.id+'/canva',{hash:next.hash});assert.equal(r.status,200);}
  assert.equal(mutations,3);assert.equal((await app.request('https://command.example/'+next.id+'/final.png')).status,400);
  app=createCreativeStudio(config);const list=await (await app.request('https://command.example/pieces')).json();next=list.find((x:any)=>x.id===next.id);assert.equal(next.final,true);assert.equal(next.state,'review');assert.ok(next.events.some((e:any)=>e.decision==='canva_export_review'));
  await post('/'+next.id+'/decision',{hash:next.hash,decision:'approved'});assert.equal((await app.request('https://command.example/'+next.id+'/final.png')).status,200);assert.equal((await app.request('https://command.example/'+next.id+'/caption.txt')).status,200);
  await post('/'+next.id+'/decision',{hash:next.hash,decision:'rejected',note:'Rechazo posterior de prueba'});assert.equal((await app.request('https://command.example/'+next.id+'/final.png')).status,400);
  const third=await (await post('/'+p.id+'/revise',{hash:p.hash,note:'Solo QA',logo,brandConfirmed:true})).json();await post('/'+third.id+'/decision',{hash:third.hash,decision:'approved'});failSync=true;assert.equal((await post('/'+third.id+'/canva',{hash:third.hash})).status,400);const count=mutations;assert.equal((await post('/'+third.id+'/canva',{hash:third.hash})).status,400);assert.equal(mutations,count,'Ambiguous mutation is not retried');
  now+=15000000;failRefresh=true;const failed=await post('/connection');assert.equal(failed.status,400);assert.match(await failed.text(),/CANVA_RECONNECT_REQUIRED/);
  const ciphertext=await readFile(join(dir,'grant'));for(const s of [access,refresh,secret])assert.ok(!ciphertext.includes(Buffer.from(s)));
  console.log(JSON.stringify({pass:true,mode:'LOCAL_WITH_SIMULATED_CANVA',batchMs:Math.round(performance.now()-started),renderMs:pieces.map((p:any)=>p.renderMs),checks:['4 exact dimensions','refresh serialized and encrypted','no secret leakage','brand gate','stale approval denied','no-op revision denied','revision invalidates approval','Canva upload/create/export contract','export requires second human approval','archive survives restart','rejection blocks download','ambiguous mutation not retried'],productionValidated:false}));
} finally {await rm(dir,{recursive:true,force:true});}
