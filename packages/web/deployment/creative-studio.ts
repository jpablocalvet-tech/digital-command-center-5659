import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { mkdir,readFile,writeFile,rename,readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID,createHash } from 'node:crypto';
import sharp from 'sharp';
import type { CanvaClient } from './canva-authorization';
import { escape,renderCreative,rutaCopies,type CreativeBrand,type CreativeCopy } from './creative-renderer';
import { studioPage } from './creative-studio-page';

type Piece={id:string;parent?:string;index:number;revision:number;copy:CreativeCopy;brand:CreativeBrand;brief:string;strategy:string;hash:string;state:'review'|'approved'|'rejected';createdAt:string;renderMs:number;events:{at:string;decision:string;note:string}[];uploadId?:string;assetId?:string;designId?:string;exportId?:string;final?:boolean;syncError?:string};
type Context={brandNotes:string;strategy:string;brief:string;clientId?:number;content?:unknown[]};
const digest=(b:Buffer)=>createHash('sha256').update(b).digest('hex');
const colors=/^#[0-9a-f]{6}$/i;
const luminance=(hex:string)=>{const rgb=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return rgb[0]!*.2126+rgb[1]!*.7152+rgb[2]!*.0722;};
const copyValid=(c:CreativeCopy)=>c&&['headline','body','cta','caption'].every(k=>typeof c[k as keyof CreativeCopy]==='string')&&c.headline.split('\n').length<=2&&c.headline.split('\n').every(l=>l.length<=26)&&c.body.split('\n').length<=2&&c.body.split('\n').every(l=>l.length<=43)&&c.cta.length<=46&&c.caption.length<=2200;
export function createCreativeStudio(config:{storageDir:string;canva:CanvaClient;context:()=>Promise<Context>;brand?:()=>Promise<CreativeBrand>;fetchImpl?:typeof fetch}) {
  const app=new Hono(),root=join(config.storageDir,'creative-studio');
  let queue:Promise<unknown>=Promise.resolve();
  function lock<T>(fn:()=>Promise<T>){const task=queue.then(fn);queue=task.catch(()=>{});return task;}
  const file=(id:string,name:string)=>{if(!/^[a-f0-9-]{36}$/.test(id))throw new Error('INVALID_ID');return join(root,id,name);};
  const read=async(id:string)=>JSON.parse(await readFile(file(id,'piece.json'),'utf8')) as Piece;
  const save=async(p:Piece)=>{const path=file(p.id,'piece.json'),tmp=path+'.tmp';await writeFile(tmp,JSON.stringify(p),{mode:0o600});await rename(tmp,path);};
  const event=(p:Piece,decision:string,note='')=>p.events.push({at:new Date().toISOString(),decision,note});
  async function create(index:number,copy:CreativeCopy,brand:CreativeBrand,brief:string,strategy:string,parent?:Piece){
    if(!copyValid(copy)||[brand.ink,brand.paper,brand.accent].some(c=>!colors.test(c)))throw new Error('INVALID_CREATIVE');
    const light=luminance(brand.paper),dark=luminance(brand.ink);if((Math.max(light,dark)+.05)/(Math.min(light,dark)+.05)<4.5)throw new Error('INVALID_BRAND_CONTRAST');
    for(const [text,font,size] of [[copy.headline,'serif',70],[copy.body,'sans-serif',27],[copy.cta,'sans-serif',26]] as const){
      for(const line of text.split('\n')){if(!line.trim())continue;const bounds=await sharp({text:{text:escape(line),font:font+' '+size,rgba:true}}).metadata();if((bounds.width||0)>920)throw new Error('INVALID_TEXT_OVERFLOW');}
    }
    const started=performance.now(),id=randomUUID();await mkdir(join(root,id),{recursive:true,mode:0o700});
    const svg=renderCreative(index,copy,brand),png=await sharp(Buffer.from(svg)).png().toBuffer();
    await writeFile(file(id,'source.svg'),svg,{mode:0o600});await writeFile(file(id,'preview.png'),png,{mode:0o600});
    const p:Piece={id,parent:parent?.id,index,revision:(parent?.revision||0)+1,copy,brand,brief,strategy,hash:digest(png),state:'review',createdAt:new Date().toISOString(),renderMs:Math.round(performance.now()-started),events:[]};event(p,'created',parent?'Nueva versión; requiere aprobación.':'Prueba interna.');await save(p);return p;
  }
  app.use('*',async(c,next)=>{if(!config.storageDir)return c.json({error:'PERSISTENT_STORAGE_REQUIRED'},503);await next();c.header('Cache-Control','private, no-store');});
  app.use('*',bodyLimit({maxSize:3*1024*1024}));
  app.onError((error,c)=>{const code=error.message;return c.json({error:/^(CANVA_|INVALID_|PERSISTENT_|BRAND_|STALE_|NOTE_|NOT_|EXPORT_|SYNC_)/.test(code)?code:'STUDIO_OPERATION_FAILED'},400);});
  app.get('/',c=>c.html(studioPage));
  app.get('/context',async c=>c.json(await config.context()));
  app.post('/connection',async c=>{const data=await config.canva.request('/users/me/capabilities');return c.json({connected:true,capabilities:data,checkedAt:new Date().toISOString()});});
  app.get('/pieces',async c=>{
    await mkdir(root,{recursive:true,mode:0o700});const ids=(await readdir(root)).filter(id=>/^[a-f0-9-]{36}$/.test(id));
    const pieces=await Promise.all(ids.map(read));return c.json(pieces.sort((a,b)=>b.createdAt.localeCompare(a.createdAt)).map(p=>({...p,brand:{...p.brand,logo:undefined}})));
  });
  app.post('/pilot',c=>lock(async()=>{
    const input=await c.req.json();if(typeof input.brief!=='string'||input.brief.length<10||input.brief.length>5000||typeof input.strategy!=='string'||input.strategy.length>5000)throw new Error('INVALID_BRIEF');
    const copies=input.copies??rutaCopies;
    if(!Array.isArray(copies)||copies.length!==4||!copies.every(copyValid))throw new Error('INVALID_CREATIVE');
    // This renderer is deliberately limited to the RUTA internal pilot.
    const brand:CreativeBrand=config.brand?await config.brand():{name:'RUTA',ink:'#173E36',paper:'#F2EBDC',accent:'#B26A43',confirmed:false};
    const pieces=[];for(let i=0;i<4;i++)pieces.push(await create(i,copies[i]!,brand,input.brief,input.strategy));
    return c.json({pieces,mode:'composicion-editorial',notice:input.copies?'Copy recibido para componer; requiere revisión.':'Copy propuesto para prueba RUTA; no generado por IA ni aprobado.'});
  }));
  app.get('/:id/preview.png',async c=>{const p=await read(c.req.param('id'));return new Response(await readFile(file(p.id,p.final?'final.png':'preview.png')),{headers:{'Content-Type':'image/png','Cache-Control':'private, no-store'}});});
  app.post('/:id/revise',c=>lock(async()=>{
    const p=await read(c.req.param('id')),input=await c.req.json();if(input.hash!==p.hash)throw new Error('STALE_VERSION');
    if(typeof input.note!=='string'||!input.note.trim()||input.note.length>2000)throw new Error('NOTE_REQUIRED');
    const brand={...p.brand};
    if(input.logo){
      if(typeof input.logo!=='string'||!/^data:image\/(png|jpeg);base64,[a-zA-Z0-9+/=]+$/.test(input.logo))throw new Error('INVALID_LOGO');
      const bytes=Buffer.from(input.logo.split(',')[1],'base64');if(bytes.length>1024*1024)throw new Error('INVALID_LOGO');
      const normalized=await sharp(bytes,{limitInputPixels:16e6}).resize(800,400,{fit:'inside',withoutEnlargement:true}).png().toBuffer();brand.logo='data:image/png;base64,'+normalized.toString('base64');
    }
    if(input.colors){if(!Array.isArray(input.colors)||input.colors.length!==3||input.colors.some((s:unknown)=>typeof s!=='string'||!colors.test(s)))throw new Error('INVALID_COLORS');[brand.ink,brand.paper,brand.accent]=input.colors;}
    brand.confirmed=input.brandConfirmed===true&&Boolean(brand.logo);
    if(JSON.stringify(input.copy||p.copy)===JSON.stringify(p.copy)&&JSON.stringify(brand)===JSON.stringify(p.brand))throw new Error('INVALID_REVISION_NO_CHANGE');
    const next=await create(p.index,input.copy||p.copy,brand,p.brief,p.strategy,p);event(next,'revision',input.note);await save(next);return c.json({...next,brand:{...next.brand,logo:undefined}});
  }));
  app.post('/:id/decision',c=>lock(async()=>{
    const p=await read(c.req.param('id')),input=await c.req.json();if(input.hash!==p.hash)throw new Error('STALE_VERSION');
    if(!['approved','rejected'].includes(input.decision))throw new Error('INVALID_DECISION');
    if(input.decision==='approved'&&(!p.brand.logo||!p.brand.confirmed))throw new Error('BRAND_CONFIRMATION_REQUIRED');
    if(input.decision==='rejected'&&(typeof input.note!=='string'||!input.note.trim()))throw new Error('NOTE_REQUIRED');
    if(input.note&&String(input.note).length>2000)throw new Error('INVALID_NOTE');
    p.state=input.decision;event(p,input.decision,String(input.note||''));await save(p);return c.json({state:p.state});
  }));
  // Each request advances one durable step. Polls are reads; mutation failures
  // stop automatic retries because Canva does not promise idempotency here.
  app.post('/:id/canva',c=>lock(async()=>{
    const p=await read(c.req.param('id'));const input=await c.req.json();if(input.hash!==p.hash)throw new Error('STALE_VERSION');
    if(p.state==='rejected')throw new Error('NOT_APPROVED');if(!p.brand.logo)throw new Error('BRAND_LOGO_REQUIRED');if(p.syncError)throw new Error('SYNC_REQUIRES_INSPECTION');if(p.final)return c.json({done:true});
    const json=(body:unknown)=>({method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    try{
      if(!p.uploadId){const png=await readFile(file(p.id,'preview.png'));const data=await config.canva.request('/asset-uploads',{method:'POST',headers:{'Content-Type':'application/octet-stream','Asset-Upload-Metadata':JSON.stringify({name_base64:Buffer.from('RUTA '+p.index+' v'+p.revision).toString('base64')})},body:new Uint8Array(png)});if(!data.job?.id)throw new Error('CANVA_INVALID_RESPONSE');p.uploadId=data.job.id;}
      else if(!p.assetId){const data=await config.canva.request('/asset-uploads/'+encodeURIComponent(p.uploadId));if(data.job?.status==='failed')throw new Error('CANVA_ASSET_FAILED');if(data.job?.status==='success'){if(!data.job.asset?.id)throw new Error('CANVA_INVALID_RESPONSE');p.assetId=data.job.asset.id;}}
      else if(!p.designId){const data=await config.canva.request('/designs',json({design_type:{type:'custom',width:1080,height:p.index>=2?1920:1350},asset_id:p.assetId,title:'RUTA '+p.index+' v'+p.revision}));if(!data.design?.id)throw new Error('CANVA_INVALID_RESPONSE');p.designId=data.design.id;}
      else if(!p.exportId){const data=await config.canva.request('/exports',json({design_id:p.designId,format:{type:'png',pages:[1]}}));if(!data.job?.id)throw new Error('CANVA_INVALID_RESPONSE');p.exportId=data.job.id;}
      else {const data=await config.canva.request('/exports/'+encodeURIComponent(p.exportId));if(data.job?.status==='failed')throw new Error('CANVA_EXPORT_FAILED');
        if(data.job?.status==='success'){
          if(!Array.isArray(data.job.urls)||data.job.urls.length!==1)throw new Error('EXPORT_INVALID_RESPONSE');
          const url=new URL(data.job.urls[0]);if(url.protocol!=='https:'||!url.hostname.endsWith('.canva.com')||url.username||url.password)throw new Error('EXPORT_UNTRUSTED_URL');
          const response=await (config.fetchImpl||fetch)(url,{redirect:'error',signal:AbortSignal.timeout(20000)});if(!response.ok)throw new Error('EXPORT_DOWNLOAD_FAILED');
          const reader=response.body?.getReader();if(!reader)throw new Error('EXPORT_DOWNLOAD_FAILED');let length=0;const chunks:Uint8Array[]=[];
          for(;;){const {done,value}=await reader.read();if(done)break;length+=value.length;if(length>20*1024*1024){await reader.cancel();throw new Error('EXPORT_TOO_LARGE');}chunks.push(value);}
          const png=Buffer.concat(chunks);const meta=await sharp(png,{limitInputPixels:4e6}).metadata();if(meta.format!=='png'||meta.width!==1080||meta.height!==(p.index>=2?1920:1350))throw new Error('EXPORT_WRONG_DIMENSIONS');
          await writeFile(file(p.id,'final.png'),png,{mode:0o600});p.final=true;p.hash=digest(png);p.state='review';event(p,'canva_export_review','Revisar el archivo exportado antes de su aprobación final.');
        }
      }
      await save(p);return c.json({done:Boolean(p.final),state:p.state});
    }catch(error){p.syncError=error instanceof Error&&/^(CANVA_|EXPORT_)/.test(error.message)?error.message:'CANVA_SYNC_UNCERTAIN';event(p,'sync_stopped',p.syncError);await save(p);throw new Error(p.syncError);}
  }));
  app.get('/:id/final.png',async c=>{const p=await read(c.req.param('id'));if(p.state!=='approved'||!p.final)throw new Error('NOT_FINAL_APPROVED');return new Response(await readFile(file(p.id,'final.png')),{headers:{'Content-Type':'image/png','Content-Disposition':`attachment; filename="RUTA-${p.index+1}-v${p.revision}.png"`}});});
  app.get('/:id/caption.txt',async c=>{const p=await read(c.req.param('id'));if(p.state!=='approved'||!p.final)throw new Error('NOT_FINAL_APPROVED');return c.text(p.copy.caption,200,{'Content-Disposition':`attachment; filename="RUTA-${p.index+1}-copy.txt"`});});
  return app;
}
