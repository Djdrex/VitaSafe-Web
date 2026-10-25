'use strict';
const assert=require('node:assert/strict'),crypto=require('node:crypto');
const {createApp}=require('../server');
const {createPasswordHash}=require('../src/security/password');
const excel=require('../src/integrations/excel');
const Excel=require('exceljs');
const sha=v=>crypto.createHash('sha256').update(v).digest('hex');
async function verifyIsolated(db,env){
 if(env.VITASAFE_TEST_ENV!=='true'||env.DEMO_MODE!=='true')throw Error('Isolated demo required');
 if(db.kind==='postgres'){
  const url=new URL(env.DATABASE_URL);
  if(url.hostname!=='dpg-dbep767avr4c73bll9u0-a')throw Error('Expected existing internal database hostname');
 }
 const app=await createApp({database:db,environment:env});
 const password=crypto.randomBytes(32).toString('base64url');
 const customerId='DEMO-FICTICIO-CLIENTE';
 let customerCookie;
 await db.transaction(async()=>{
  const existing=await db.prepare('SELECT email,role FROM users WHERE id=?').get(customerId);
  if(existing)assert.deepEqual(existing,{email:'cliente-ficticio@example.invalid',role:'customer'});
  else await db.prepare('INSERT INTO users(id,email,name,password_hash,role) VALUES(?,?,?,?,?)').run(customerId,'cliente-ficticio@example.invalid','CLIENTE FICTICIO - SIN VALOR COMERCIAL',createPasswordHash(password),'customer');
  const t=crypto.randomBytes(32).toString('base64url');customerCookie='vs_session='+t;
  await db.prepare('INSERT INTO sessions(token_hash,expires,user_id) VALUES(?,?,?)').run(sha(t),Date.now()+300000,customerId);
 });
 await new Promise(r=>app.server.listen(0,'127.0.0.1',r));
 const base='http://127.0.0.1:'+app.server.address().port;
 const request=(path,method='GET',body,cookie)=>fetch(base+path,{method,headers:{...(cookie?{Cookie:cookie}:{}),...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});
 let adminCookie;
 try{
  assert.equal((await request('/api/admin/stats')).status,401);
  const identity=await (await request('/api/account/me','GET',null,customerCookie)).json();
  assert.equal(identity.user.role,'customer');
  assert.equal((await request('/api/admin/stats','GET',null,customerCookie)).status,401);
  assert.equal((await request('/api/account/register','POST',{})).status,403);
  assert.equal((await request('/api/order','POST',{})).status,403);
  assert.equal((await request('/api/account/login','POST',{email:env.VITASAFE_ADMIN_EMAIL,password:crypto.randomBytes(24).toString('hex')})).status,401);
  const login=await request('/api/account/login','POST',{email:env.VITASAFE_ADMIN_EMAIL,password:env.VITASAFE_ADMIN_PASSWORD});
  assert.equal(login.status,200);assert.equal((await login.json()).user.role,'admin');
  adminCookie=login.headers.get('set-cookie').split(';')[0];
  assert.equal((await request('/api/admin/stats','GET',null,adminCookie)).status,200);
  assert.equal((await request('/api/auth/status','GET',null,adminCookie)).status,200);
  for(const type of Object.keys(excel.columns)){
   const out=await request('/api/admin/excel/export?type='+type,'GET',null,adminCookie);assert.equal(out.status,200);
   const bytes=Buffer.from(await out.arrayBuffer());assert.equal((await excel.preview(type,bytes)).errors.length,0);
   const preview=await fetch(base+'/api/admin/excel/preview?type='+type,{method:'POST',headers:{Cookie:adminCookie},body:bytes});assert.equal(preview.status,200);
   const apply=await fetch(base+'/api/admin/excel/apply?type='+type,{method:'POST',headers:{Cookie:adminCookie},body:bytes});assert.equal(apply.status,403);
  }
  const workbook=new Excel.Workbook(),sheet=workbook.addWorksheet('inventory');sheet.addRow(excel.columns.inventory);sheet.addRow(['campus',-1,'FICTICIO']);sheet.addRow(['campus','1.5','FICTICIO']);
  assert.equal((await excel.preview('inventory',Buffer.from(await workbook.xlsx.writeBuffer()))).errors.length,2);
  const catalogue=await (await request('/api/products')).json();assert.equal(catalogue.products.length,6);
  const marker=await db.prepare('SELECT v FROM sync_state WHERE k=?').get('isolated_persistence_marker');
  if(!marker)await db.prepare('INSERT INTO sync_state(k,v) VALUES(?,?)').run('isolated_persistence_marker',crypto.randomUUID());
  const report={demo:true,checks:['catalogue','admin_login','wrong_password','customer_role_denied_admin','registration_blocked','sales_blocked','excel_four_modules','inventory_validation'],previous_marker:!!marker,database:db.kind};
  await db.prepare('INSERT INTO sync_state(k,v) VALUES(?,?) ON CONFLICT(k) DO UPDATE SET v=excluded.v').run('isolated_last_verification',JSON.stringify(report));
  return report;
 }finally{await new Promise(r=>app.server.close(r));await db.prepare('DELETE FROM sessions WHERE token_hash=?').run(sha(customerCookie.slice(11)));if(adminCookie)await db.prepare('DELETE FROM sessions WHERE token_hash=?').run(sha(adminCookie.slice(11)))}
}
if(require.main===module){const {openDatabase}=require('../src/db/database');(async()=>{if(!process.env.DATABASE_URL)throw Error('Secure configuration required');const db=await openDatabase(process.env);try{console.log('isolated_verification',JSON.stringify(await verifyIsolated(db,process.env)))}finally{await db.close()}})().catch(()=>{console.error('Isolated verification failed; inspect secure configuration and test results. No credentials logged.');process.exitCode=1})}
module.exports={verifyIsolated};
