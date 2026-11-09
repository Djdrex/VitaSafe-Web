'use strict';
const assert=require('node:assert/strict');
const {randomUUID}=require('node:crypto');
const lots=require('../src/commerce/lots');
const core=require('../src/commerce/core');
const catalogue=require('../src/catalogue');

async function verifyLots(db) {
  const rollback=Error('Ensayo finalizado');
  const product='DEMO-LOT-'+randomUUID();
  const actor={role:'admin',id:'warehouse-test'};
  try {
    await db.transaction(async()=>{
      // Keep every synthetic row in one transaction. Nested application transactions
      // use savepoints so an expected failed reservation can roll back independently.
      let counter=0;
      const scoped=Object.create(db);
      scoped.transaction=async fn=>{
        const point='lot_test_'+(++counter);
        await db.exec('SAVEPOINT '+point);
        try {return await fn();}
        catch(error){await db.exec('ROLLBACK TO SAVEPOINT '+point);throw error;}
        finally {await db.exec('RELEASE SAVEPOINT '+point);}
      };
      const customer=(await core.fixtures(scoped,product)).customer;
      await catalogue.save(scoped,{id:product,name:'FICTICIO lote temporal',category:'Universitario',price:100,stock:2,active:true},actor);
      const receive=(code,expires)=>lots.receipt(scoped,{product,component:'FICTICIO insumo',perKit:1,code,expires,quantity:1,key:randomUUID()},actor);
      const order=()=>core.createOrder(scoped,{customer,catalogue:true,key:randomUUID(),items:[{id:product,qty:1}]},actor);
      await receive('VENCIDO','2000-01-01');
      await assert.rejects(order(),{status:409});
      await receive('VIGENTE','2099-01-01');
      const reserved=await order();
      await assert.rejects(order(),{status:409});
      await core.transition(scoped,reserved.id,'cancelled',actor);
      const [row]=await lots.withAvailability(scoped,[{id:product,stock:2}],false);
      assert.equal(row.stock,1);
      const platform=require('../src/platform');
      const zone=await platform.saveRecord(scoped,{kind:'delivery',title:'FICTICIO zona temporal',fee_soles:'2.50',opens:'09:00',closes:'15:00'},actor);
      const published=await platform.editorial(scoped,zone.id,'publish',zone.revision,actor);
      const date=new Date(Date.now()+2*86400000).toISOString().slice(0,10);
      const selected={id:published.id,revision:published.revision,date,time:'10:00'};
      const input={customer,catalogue:true,items:[{id:product,qty:1}],key:randomUUID(),delivery:selected};
      const quotedOrder=await core.createOrder(scoped,input,actor);
      assert.equal(quotedOrder.total,350);
      const saved=await scoped.prepare("SELECT data FROM platform_records WHERE id=? AND kind='order_delivery'").get('order-delivery:'+quotedOrder.id);
      assert.equal(JSON.parse(saved.data).fee,250);
      await platform.editorial(scoped,zone.id,'archive',published.revision,actor);
      assert.equal((await core.createOrder(scoped,input,actor)).id,quotedOrder.id);
      await assert.rejects(core.createOrder(scoped,{...input,key:randomUUID()},actor),{status:409});
      throw rollback;
    });
  }catch(error){if(error!==rollback)throw error;}
  assert.equal(await db.prepare('SELECT id FROM products WHERE id=?').get(product),undefined);
  return true;
}
module.exports={verifyLots};
