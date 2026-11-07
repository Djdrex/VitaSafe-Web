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
      throw rollback;
    });
  }catch(error){if(error!==rollback)throw error;}
  assert.equal(await db.prepare('SELECT id FROM products WHERE id=?').get(product),undefined);
  return true;
}
module.exports={verifyLots};
