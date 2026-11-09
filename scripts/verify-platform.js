'use strict';
const assert=require('node:assert/strict'),crypto=require('node:crypto');
async function verifyPlatform(db,request,adminCookie,customerCookie,realLogin=false){const root='/api/platform/';const call=async(path,b)=>{const r=await request(root+path,b?'POST':'GET',b||null,adminCookie);assert.equal(r.status,path==='asset'?201:200,path);return r.json()};const publicData=await call('public');assert.ok(publicData.pages.some(p=>p.id==='organizacion'));assert.equal((await request(root+'admin')).status,403);assert.equal((await request(root+'admin','GET',null,customerCookie)).status,403);
 const prior=await db.prepare('SELECT v FROM sync_state WHERE k=?').get('platform_persisted');if(prior)assert.ok(await db.prepare('SELECT id FROM platform_records WHERE id=?').get(prior.v));
 let resource=await call('save',{kind:'resource',title:'FICTICIO verificación editorial',body:'Recurso técnico de ensayo; no contiene instrucciones médicas.',format:'guide',access:'free'});assert.equal((await request(root+'resource/'+resource.id)).status,404);resource=await call('editorial',{id:resource.id,revision:resource.revision,action:'approve'});resource=await call('editorial',{id:resource.id,revision:resource.revision,action:'publish'});assert.equal((await request(root+'resource/'+resource.id)).status,200);resource=await call('editorial',{id:resource.id,revision:resource.revision,action:'archive'});assert.equal((await request(root+'resource/'+resource.id)).status,404);
 let privateFile='';
 const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6hT8AAAAASUVORK5CYII=','base64');
 if(realLogin){
   const file=await call('asset',{mime:'image/png',base64:png.toString('base64')});
   resource=await call('save',{...resource,title:'FICTICIO verificación de archivo privado',format:'image',access:'premium',asset_id:file.id,download:true});
   resource=await call('editorial',{id:resource.id,revision:resource.revision,action:'approve'});
   resource=await call('editorial',{id:resource.id,revision:resource.revision,action:'publish'});
   privateFile=root+'resource/'+resource.id+'?file=original&download=1';
   assert.equal((await request(privateFile)).status,403);
   assert.equal((await request(privateFile,'GET',null,customerCookie)).status,403);
 }
 const plan=await call('save',{kind:'plan',title:'FICTICIO verificación automática '+crypto.randomUUID(),amount:100,body:'Plan exclusivo de esta ejecución automática. No reutilizar en ensayos manuales.'});const input={...(realLogin?{recipient:'verification'}:{}),planId:plan.id,amount:100,transactionId:'DEMO-'+crypto.randomUUID()};const a=await call('subscription-simulate',input),b=await call('subscription-simulate',input);assert.equal(a.id,b.id);const s=(await call('admin')).subscriptions.find(s=>s.id===a.subscription_id);assert.ok(s.access);
 if(realLogin){
   const me=await (await request(root+'me','GET',null,customerCookie)).json();
   assert.ok(me.subscriptions.some(x=>x.id===s.id && x.access));
   const response=await request(privateFile,'GET',null,customerCookie);
   assert.equal(response.status,200);assert.ok(Buffer.from(await response.arrayBuffer()).equals(png));
   assert.equal((await request(privateFile)).status,403);
 }
 await call('subscription-action',{id:s.id,action:'cancel',reason:'FICTICIO comprobar acceso hasta fin'});assert.ok((await call('admin')).subscriptions.find(x=>x.id===s.id).access);await call('subscription-action',{id:s.id,action:'refund',reason:'FICTICIO concluir ensayo sin acceso residual'});assert.equal((await call('admin')).subscriptions.find(x=>x.id===s.id).access,false);
 if(realLogin){
   assert.equal((await request(privateFile,'GET',null,customerCookie)).status,403);
   await call('editorial',{id:resource.id,revision:resource.revision,action:'archive'});
 }
 await call('editorial',{id:plan.id,revision:plan.revision,action:'archive'});
 const catalog=await call('catalogue');assert.equal(catalog.categories.length,7);const existing=catalog.products.find(p=>p.id==='DEMO-CATALOGUE-VERIFY');const product=await call('catalogue-save',{id:'DEMO-CATALOGUE-VERIFY',revision:existing?.revision||0,name:'FICTICIO verificación de catálogo',slug:'demo-catalogue-verify',description:'Registro técnico privado, no comercial',category:'Universitario',price:100,cost:50,stock:2,active:false,contents:'FICTICIO'});const stored=(await call('catalogue')).products.find(p=>p.id===product.id);assert.equal(stored.cost,50);assert.equal(stored.stock,2);const publicCatalogue=await (await request('/api/products')).json();assert.ok(!publicCatalogue.products.some(p=>p.id===product.id));assert.ok(publicCatalogue.products.every(p=>!('cost' in p)));assert.equal((await request(root+'catalogue-save','POST',{name:'X'},customerCookie)).status,403);
 const faq=await call('save',{kind:'faq',title:'FICTICIO pregunta de verificación',body:'Respuesta técnica, no condición comercial.',category:'Productos',order:1});const published=await call('editorial',{id:faq.id,revision:faq.revision,action:'publish'});assert.ok((await call('public')).faqs.some(f=>f.id===faq.id));await call('editorial',{id:faq.id,revision:published.revision,action:'archive'});assert.ok(!(await call('public')).faqs.some(f=>f.id===faq.id));
 const jobs=await call('queue-simulate',{});assert.equal(jobs.simulated,true);assert.ok(Number.isInteger(jobs.prepared));
 const response=await request(root+'report','GET',null,adminCookie);assert.equal(response.status,200);const w=new(require('exceljs').Workbook)();await w.xlsx.load(Buffer.from(await response.arrayBuffer()));assert.equal(w.worksheets.length,17);await db.prepare('INSERT INTO sync_state(k,v) VALUES(?,?) ON CONFLICT(k) DO UPDATE SET v=excluded.v').run('platform_persisted',resource.id);return {customer_login_premium_file_revoke:realLogin,catalogue_editor:true,catalogue_cost_private:true,faq_lifecycle:true,editorial:true,order_notifications_simulated:true,role_checks:true,annual_subscription:true,duplicate_confirmation:true,cancellation_keeps_term:true,refund_revokes:true,report_sheets:17,previous_record:!!prior};}
module.exports={verifyPlatform};
