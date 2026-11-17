'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {PGlite}=require('@electric-sql/pglite');
const {openDatabase}=require('../src/db/database');
const {createApp}=require('../server');
const catalogue=require('../src/catalogue');
test('isolated guest and signed customer order separate SKUs, retry, track and release only their own stock',async()=>{
 const db=await openDatabase({}, {pglite:new PGlite()});
 const password=crypto.randomBytes(32).toString('hex');
 const app=await createApp({database:db,environment:{DEMO_MODE:'true',VITASAFE_TEST_ENV:'true',VITASAFE_TEST_CUSTOMER_PASSWORD:password}});
 await new Promise(r=>app.server.listen(0,'127.0.0.1',r));
 const base='http://127.0.0.1:'+app.server.address().port;
 const req=(path,cookie='',input)=>fetch(base+path,{method:input?'POST':'GET',headers:{Cookie:cookie,'Content-Type':'application/json'},body:input?JSON.stringify(input):undefined});
 const endpoint='/api/demo/buyer/';
 try{
  for(const variant of ['A','B'])await catalogue.save(db,{id:'SKU-'+variant,name:'FICTICIO',category:'Oficina',family:'Familia ficticia',variant,price:200,stock:2,active:true,cost:50},{id:'owner-test',role:'admin'});
  const product=(await (await req('/api/products')).json()).products.find(p=>p.id==='SKU-A');
  assert.equal(product.family,'Familia ficticia');assert.equal(product.variant,'A');assert.equal('cost' in product,false);
  const guest=(await req(endpoint+'options')).headers.get('set-cookie').split(';')[0];
  const login=await req('/api/account/login','',{email:'premium-ensayo@example.invalid',password});assert.equal(login.status,200);
  const account=login.headers.get('set-cookie').split(';')[0];
  const input={confirm_fictional:true,key:crypto.randomUUID(),items:[{id:'SKU-A',qty:2}]};
  const post=(c,b)=>req(endpoint+'checkout',c,b);
  assert.equal((await post('',input)).status,401);
  const first=await post(guest,input);assert.equal(first.status,201);
  const guestOrder=await first.json();assert.equal(guestOrder.total,400);
  assert.equal((await post(guest,input)).status,200);
  assert.equal((await post(account,input)).status,409);
  const second=await post(account,{...input,items:[{id:'SKU-B',qty:1}]});assert.equal(second.status,201);
  const mine=await second.json();
  assert.deepEqual((await (await req(endpoint+'orders',account)).json()).orders.map(o=>o.id),[mine.id]);
  assert.equal((await req(endpoint+'cancel',guest,{id:mine.id})).status,403);
  assert.equal((await req(endpoint+'cancel',guest,{id:guestOrder.id})).status,200);
  await require('../src/commerce/buyer').expireBuyers(db,Date.now()+3600000);
  assert.deepEqual((await db.prepare("SELECT stock FROM products WHERE id IN ('SKU-A','SKU-B') ORDER BY id").all()).map(p=>p.stock),[2,2]);
  assert.equal((await req('/api/order',guest,input)).status,403);
 }finally{await new Promise(r=>app.server.close(r));await db.close();}
});
