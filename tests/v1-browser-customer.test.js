'use strict';
const test=require('node:test'), assert=require('node:assert/strict'),crypto=require('node:crypto');
const {PGlite}=require('@electric-sql/pglite');
const {openDatabase}=require('../src/db/database');
const {createApp}=require('../server');
const fixture=require('../src/security/demo-customer');
const {createPasswordHash}=require('../src/security/password');

test('browser customer uses password, isolated roles and immediate revocation with the same cookie',async()=>{
  const db=await openDatabase({}, {pglite:new PGlite()});
  const secret=()=>crypto.randomBytes(32).toString('base64url');
  const env={DEMO_MODE:'true',VITASAFE_TEST_ENV:'true',VITASAFE_TEST_CUSTOMER_PASSWORD:secret(),VITASAFE_ADMIN_PASSWORD:secret(),VITASAFE_ADMIN_EMAIL:'owner@example.invalid'};
  let app,base;
  async function start(environment){
    app=await createApp({database:db,environment});
    await new Promise(resolve=>app.server.listen(0,'127.0.0.1',resolve));
    base='http://127.0.0.1:'+app.server.address().port;
  }
  async function stop(){await new Promise(resolve=>app.server.close(resolve));app=null;}
  const req=(path,cookie,body)=>fetch(base+path,{method:body?'POST':'GET',headers:{...(cookie?{cookie}:{}),'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});
  const login=(email,password)=>req('/api/account/login',null,{email,password});
  const cookie=async r=>{assert.equal(r.status,200);return r.headers.get('set-cookie').split(';')[0];};
  try{
    await start(env);
    const buyer=await cookie(await login(fixture.browser.email,env.VITASAFE_TEST_CUSTOMER_PASSWORD));
    const owner=await cookie(await login(env.VITASAFE_ADMIN_EMAIL,env.VITASAFE_ADMIN_PASSWORD));
    assert.equal((await login(fixture.browser.email,secret())).status,401);
    const other=secret();
    await db.prepare("INSERT INTO users(id,email,name,password_hash,role) VALUES(?,?,?,?,'customer')").run('other','other@example.invalid','FICTICIO',createPasswordHash(other));
    assert.equal((await login('other@example.invalid',other)).status,403);
    assert.equal((await (await req('/api/config',buyer)).json()).customer_session,true);
    assert.equal((await req('/api/platform/admin',buyer)).status,403);
    assert.equal((await req('/api/account/register',null,{})).status,403);
    const admin=async(path,body)=>{const r=await req('/api/platform/'+path,owner,body);assert.equal(r.status,200);return r.json();};
    const plan=await admin('save',{kind:'plan',title:'FICTICIO',amount:100});
    const input={recipient:'browser',planId:plan.id,amount:100,transactionId:'DEMO-'+crypto.randomUUID()};
    assert.equal((await req('/api/platform/subscription-simulate',owner,{...input,recipient:'verification'})).status,400);
    assert.equal((await req('/api/platform/subscription-simulate',buyer,input)).status,403);
    const term=await admin('subscription-simulate',input);
    assert.equal((await admin('subscription-simulate',input)).id,term.id);
    const mine=async()=> (await (await req('/api/platform/me',buyer)).json()).subscriptions;
    assert.deepEqual((await mine()).map(s=>[s.id,s.access]),[[term.subscription_id,true]]);
    assert.equal((await mine())[0].plan_title,'FICTICIO');
    assert.ok(!('request_hash' in (await mine())[0].terms[0]));
    await admin('subscription-action',{id:term.subscription_id,action:'refund',reason:'FICTICIO fin del ensayo'});
    assert.equal((await mine())[0].access,false);
    await stop();await start({...env,VITASAFE_TEST_CUSTOMER_PASSWORD:''});
    assert.equal((await login(fixture.browser.email,env.VITASAFE_TEST_CUSTOMER_PASSWORD)).status,403);
    assert.equal((await req('/api/platform/me',buyer)).status,401);
    await stop();await start(env);
    assert.equal((await req('/api/platform/me',buyer)).status,401);
  }finally{if(app)await stop();await db.close();}
});
