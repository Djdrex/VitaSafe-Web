'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {PGlite}=require('@electric-sql/pglite');
const {openDatabase}=require('../src/db/database');
const {createApp}=require('../server');
test('simulated customer mailbox verifies ownership, consumes reset once and revokes the old session',async()=>{
  const db=await openDatabase({}, {pglite:new PGlite()});
  const mailbox=[];
  const app=await createApp({database:db,environment:{DEMO_MODE:'false'},simulatedMail:async message=>mailbox.push(message)});
  await new Promise(resolve=>app.server.listen(0,'127.0.0.1',resolve));
  const base='http://127.0.0.1:'+app.server.address().port+'/api/account/';
  const post=(path,data)=>fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
  const email='prueba@example.invalid', password=crypto.randomBytes(20).toString('hex');
  try {
    const registered=await post('register',{email,password,name:'Persona ficticia'});
    assert.equal(registered.status,201);
    const cookie=registered.headers.get('set-cookie').split(';')[0];
    for(const purpose of ['verify','reset']){
      assert.equal((await post('mail/request',{email:'otra@example.invalid',purpose})).status,202);
      const requested=await post('mail/request',{email,purpose});
      assert.deepEqual(await requested.json(),{ok:true});
      const message=mailbox.at(-1);
      assert.equal(message.to,email);
      const confirmation={email,purpose,code:message.code,password:password+'-nuevo'};
      assert.equal((await post('mail/confirm',{...confirmation,email:'otra@example.invalid'})).status,400);
      assert.equal((await post('mail/confirm',confirmation)).status,200);
      assert.equal((await post('mail/confirm',confirmation)).status,400);
      if (purpose==='verify') {
        const me=await (await fetch(base+'me',{headers:{cookie}})).json();
        for (const [id,owner] of [['mine',me.user.id],['other','another-customer']]) {
          await db.prepare("INSERT INTO orders(id,secret_hash,customer,phone,delivery_type,requested_date,payment_method,items,subtotal,total) VALUES(?,?,?,?,?,?,?,?,?,?)").run(id,'unused','Ficticio','0','pickup','2026-11-16','simulado','[]',100,100);
          await db.prepare('INSERT INTO sync_state(k,v) VALUES(?,?)').run('order-owner:'+id,owner);
        }
        const history=await fetch(base+'orders?user_id=another-customer',{headers:{cookie}});
        assert.equal(history.status,200);
        assert.deepEqual((await history.json()).orders.map(o=>o.id),['mine']);
      }
    }
    assert.equal(mailbox.length,2);
    assert.equal((await (await fetch(base+'me',{headers:{cookie}})).json()).user,null);
    assert.equal((await post('login',{email,password})).status,401);
    assert.equal((await post('login',{email,password:password+'-nuevo'})).status,200);
  }finally{await new Promise(resolve=>app.server.close(resolve));await db.close();}
});
