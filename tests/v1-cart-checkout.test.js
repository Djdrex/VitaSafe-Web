'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {PGlite}=require('@electric-sql/pglite'),{openDatabase}=require('../src/db/database');
const catalogue=require('../src/catalogue'),core=require('../src/commerce/core'),recovery=require('../src/db/recovery'),secure=require('../src/backup-secure');
test('catalogue cart HTTP checkout, retry, payment, fulfilment, physical return and encrypted restore',async()=>{
 const db=await openDatabase({}, {pglite:new PGlite()});let app,restored;
 try{
 const actor={id:'DEMO-integrated-admin',role:'admin'},password=crypto.randomBytes(24).toString('hex');
 await db.prepare('INSERT INTO users(id,email,name,password_hash,role) VALUES(?,?,?,?,?)').run(actor.id,'integrated@example.invalid','FICTICIO',require('../src/security/password').createPasswordHash(password),'admin');
 app=await require('../server').createApp({database:db,environment:{DEMO_MODE:'true',VITASAFE_TEST_ENV:'true'}});await new Promise(r=>app.server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+app.server.address().port;
 let cookie='';const post=(path,data,authorized=true)=>fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json',...(authorized?{cookie}:{})},body:JSON.stringify(data)});
 const login=await post('/api/account/login',{email:'integrated@example.invalid',password});cookie=login.headers.get('set-cookie').split(';')[0];
 const p={id:'DEMO-CART-TEST',name:'FICTICIO prueba integral',category:'Universitario',slug:'demo-cart-integral',price:1234,cost:432,stock:4,active:true,revision:0};await catalogue.save(db,p,actor);
 const input={items:[{id:p.id,qty:2}],key:crypto.randomUUID(),confirm_fictional:true,price:1,customer:'IGNORED'};
 assert.equal((await post('/api/admin/simulation/catalogue-checkout',input,false)).status,401);
 assert.equal((await post('/api/admin/simulation/catalogue-checkout',{...input,confirm_fictional:false})).status,400);
 const retries=await Promise.all(Array.from({length:4},()=>post('/api/admin/simulation/catalogue-checkout',input)));for(const r of retries)assert.equal(r.status,201);const orders=await Promise.all(retries.map(r=>r.json())),o=orders[0];assert.equal(new Set(orders.map(o=>o.id)).size,1);assert.equal(o.total,2468);
 const stock=async()=>(await db.prepare('SELECT stock FROM products WHERE id=?').get(p.id)).stock;assert.equal(await stock(),2);
 assert.equal((await post('/api/order',input)).status,403);
 assert.equal((await post('/api/admin/simulation/catalogue-checkout',{...input,items:[{id:p.id,qty:1}]})).status,409);
 const stale={...p,stock:100,revision:1};await assert.rejects(catalogue.save(db,stale,actor),{status:409});
 const action=async(name,b)=>{const r=await post('/api/admin/simulation/'+name,b);assert.equal(r.status,200,await r.clone().text());return r.json()};
 await action('payment',{orderId:o.id,status:'approved'});await action('payment',{orderId:o.id,status:'approved'});assert.equal(await stock(),2);
 for(const status of ['preparing','shipped','delivered'])await action('transition',{orderId:o.id,status});
 // Unpublication and intervening stock adjustment must not break a physical return.
 let latest=(await catalogue.list(db)).find(x=>x.id===p.id);await catalogue.save(db,{...latest,active:false,stock:3},actor);
 await action('payment',{orderId:o.id,status:'refunded'});assert.equal(await stock(),3);
 await action('return',{orderId:o.id});await action('return',{orderId:o.id});assert.equal(await stock(),5);
 assert.equal((await post('/api/admin/simulation/catalogue-checkout',{...input,key:crypto.randomUUID()})).status,409);
 const report=await fetch(base+'/api/platform/report',{headers:{cookie}});assert.equal(report.status,200);const Excel=require('exceljs'),w=new Excel.Workbook();await w.xlsx.load(Buffer.from(await report.arrayBuffer()));assert.equal(w.worksheets.length,17);
 const snap=await recovery.snapshot(db),key=crypto.randomBytes(32).toString('base64'),encrypted=secure.encrypt(snap,key);assert.ok(!encrypted.includes(Buffer.from('FICTICIO prueba integral')));assert.throws(()=>secure.decrypt(encrypted,crypto.randomBytes(32).toString('base64')));
 restored=await openDatabase({}, {pglite:new PGlite()});const result=await recovery.restoreEmpty(restored,secure.decrypt(encrypted,key));assert.equal(result.restored,true);assert.equal((await core.readOrder(restored,o.id,actor)).payment_status,'refunded');assert.equal((await restored.prepare('SELECT stock FROM products WHERE id=?').get(p.id)).stock,5);await assert.rejects(recovery.restoreEmpty(restored,secure.decrypt(encrypted,key)),/empty/);
 }finally{if(app)await new Promise(r=>app.server.close(r));await db.close();if(restored)await restored.close()}
});
