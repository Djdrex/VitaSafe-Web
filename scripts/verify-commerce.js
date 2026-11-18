'use strict';
const assert=require('node:assert/strict'),crypto=require('node:crypto'),Excel=require('exceljs');
async function verifyCommerceHTTP(db,request,adminCookie,customerCookie,base){
 const old=await db.prepare('SELECT v FROM sync_state WHERE k=?').get('commerce_verified_order');
 if(old)assert.ok(await db.prepare('SELECT id FROM commerce_orders WHERE id=?').get(old.v),'Previous synthetic order persists');
 const path='/api/admin/simulation/';
 assert.equal((await request(path+'state')).status,401);assert.equal((await request(path+'state','GET',null,customerCookie)).status,401);
 assert.equal((await request(path+'prepare','POST',{},adminCookie)).status,200);
 let state=await (await request(path+'state','GET',null,adminCookie)).json();const product=state.products.find(p=>p.stock>0);assert.ok(product);const stock=product.stock;
 const payload={key:crypto.randomUUID(),items:[{id:product.id,qty:1}]};
 const results=await Promise.all(Array.from({length:4},()=>request(path+'checkout','POST',payload,adminCookie)));
 for(const r of results)assert.equal(r.status,201);const orders=await Promise.all(results.map(r=>r.json()));assert.equal(new Set(orders.map(o=>o.id)).size,1);const order=orders[0];
 const act=async(action,status)=>{const r=await request(path+action,'POST',{orderId:order.id,status},adminCookie);assert.equal(r.status,200,action+':'+status);return r.json()};
 await act('payment','rejected');await act('payment','approved');await act('payment','approved');
 for(const status of ['preparing','shipped','delivered'])await act('transition',status);
 const response=await fetch(base+path+'report',{headers:{Cookie:adminCookie}});assert.equal(response.status,200);const w=new Excel.Workbook();await w.xlsx.load(Buffer.from(await response.arrayBuffer()));assert.equal(w.worksheets.length,10);assert.ok(w.getWorksheet('Resumen').getCell('B5').value>=order.total/100);
 await act('payment','refunded');await act('return','');await act('return','');
 state=await (await request(path+'state','GET',null,adminCookie)).json();assert.equal(state.products.find(p=>p.id===product.id).stock,stock);
 const invalid=await request(path+'checkout','POST',{key:crypto.randomUUID(),items:[{id:'campus',qty:1}]},adminCookie);assert.equal(invalid.status,400);
 const {snapshot,validate}=require('../src/db/recovery');const backup=validate(await snapshot(db));assert.ok(backup.tables.commerce_orders.some(o=>o.id===order.id));
 await db.prepare('INSERT INTO sync_state(k,v) VALUES(?,?) ON CONFLICT(k) DO UPDATE SET v=excluded.v').run('commerce_verified_order',order.id);
 return {database:db.kind,previous_order:!!old,http_checkout:true,concurrent_retries:4,simulated_payment:true,fulfilment:true,refund_and_return:true,stock_conserved:true,report_sheets:10,backup_checksum:true,customer_denied:true};
}
module.exports={verifyCommerceHTTP};
