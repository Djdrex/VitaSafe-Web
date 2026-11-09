'use strict';
const {randomUUID} = require('node:crypto');
const fail = (status, message) => { throw Object.assign(new Error(message), {status}); };
const kitKey = id => 'warehouse-kit:' + id;
const allocationKey = (order,product) => 'warehouse-reservation:' + order + ':' + product;
const localDay = () => new Intl.DateTimeFormat('sv-SE',{timeZone:'America/Lima'}).format(new Date());

async function load(db, key) {
  const row = await db.prepare('SELECT data FROM platform_records WHERE id=?').get(key);
  return row ? JSON.parse(row.data) : null;
}
async function store(db,key,kind,data) {
  await db.prepare('INSERT INTO platform_records(id,kind,data,revision,updated) VALUES(?,?,?,1,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data, revision=platform_records.revision+1, updated=excluded.updated')
    .run(key,kind,JSON.stringify(data),Date.now());
}
async function audit(db,actor,action,ref,detail) {
  await db.prepare('INSERT INTO platform_audit(id,actor,action,ref,detail,created) VALUES(?,?,?,?,?,?)')
    .run(randomUUID(),actor,action,ref,JSON.stringify(detail),Date.now());
}
function label(value) {
  if (typeof value !== 'string' || !value.trim() || value.length > 80) fail(400,'Revisa el componente y el lote');
  return value.trim().normalize('NFC');
}
function positive(value) {
  if (!Number.isSafeInteger(value) || value < 1 || value > 1000000) fail(400,'Introduce una cantidad entera entre 1 y 1 000 000');
  return value;
}
async function receipt(db,input,actor) {
  if(actor?.role!=='admin') fail(403,'Acceso administrativo requerido');
  if(typeof input.product!=='string' || input.product.length>80 || !/^[\w-]+$/.test(input.product)) fail(400,'Selecciona un kit');
  if(typeof input.key!=='string' || !/^[\da-f-]{36}$/i.test(input.key)) fail(400,'Referencia de recepción inválida');
  const data={product:input.product,component:label(input.component),code:label(input.code),expires:input.expires,quantity:positive(input.quantity),perKit:positive(input.perKit)};
  if(typeof data.expires!=='string' || !/^\d{4}-\d{2}-\d{2}$/.test(data.expires) || !Number.isFinite(Date.parse(data.expires)) || new Date(data.expires).toISOString().slice(0,10)!==data.expires) fail(400,'Fecha inválida');
  return db.transaction(async()=>{
    const product=await db.prepare('SELECT id FROM products WHERE id=? FOR UPDATE').get(data.product);
    if(!product) fail(404,'Kit inexistente');
    const key='warehouse-receipt:'+data.product+':'+input.key;
    const previous=await load(db,key);
    if(previous){
      if(JSON.stringify(previous)!==JSON.stringify(data)) fail(409,'La recepción ya existe con otros datos');
      return {saved:true,reused:true};
    }
    const kit=await load(db,kitKey(data.product)) || {product:data.product,components:[]};
    let component=kit.components.find(c=>c.name===data.component);
    if(!component){component={name:data.component,perKit:data.perKit,lots:[]};kit.components.push(component);}
    if(component.perKit!==data.perKit) fail(409,'La composición vigente indica otra cantidad por kit');
    let lot=component.lots.find(l=>l.code===data.code);
    if(!lot){lot={code:data.code,expires:data.expires,available:0};component.lots.push(lot);}
    if(lot.expires!==data.expires) fail(409,'El lote tiene otra fecha de vencimiento');
    lot.available+=data.quantity;
    if(!Number.isSafeInteger(lot.available)) fail(400,'Cantidad excedida');
    await store(db,kitKey(data.product),'warehouse_kit',kit);
    await store(db,key,'warehouse_receipt',data);
    await audit(db,actor.id,'lot_received',data.product,{...data,receipt:input.key});
    return {saved:true,reused:false};
  });
}
// Caller holds the catalogue product row lock and the same transaction as the order.
async function move(db,product,delta,reason,order,actor){
  if(!['reserved','returned','refunded','cancelled','rejected'].includes(reason))return;
  const key=allocationKey(order,product);
  const kit=await load(db,kitKey(product));
  if(!kit)return;
  if(reason==='reserved'){
    const entries=[], today=localDay();
    for(const component of kit.components){
      let remaining=-delta*component.perKit;
      const lots=component.lots.filter(l=>l.expires>=today && l.available>0)
        .sort((a,b)=>a.expires.localeCompare(b.expires)||a.code.localeCompare(b.code));
      for(const lot of lots){
        const units=Math.min(lot.available,remaining);
        lot.available-=units;remaining-=units;
        entries.push({component:component.name,code:lot.code,units});
        if(!remaining)break;
      }
      if(remaining)fail(409,'Lotes vigentes insuficientes para '+component.name);
    }
    await store(db,key,'warehouse_reservation',{entries,released:false});
    await audit(db,actor,'lots_reserved',order,{product,entries});
  }else{
    const allocation=await load(db,key);
    if(!allocation || allocation.released)return;
    for(const entry of allocation.entries){
      const lot=kit.components.find(c=>c.name===entry.component)?.lots.find(l=>l.code===entry.code);
      if(!lot)fail(409,'Falta el lote original de la reserva');
      lot.available+=entry.units;
    }
    allocation.released=true;
    await store(db,key,'warehouse_reservation',allocation);
    await audit(db,actor,'lots_released',order,{product,reason,entries:allocation.entries});
  }
  await store(db,kitKey(product),'warehouse_kit',kit);
}
async function list(db){return (await db.prepare("SELECT data FROM platform_records WHERE kind='warehouse_kit' ORDER BY id").all()).map(r=>JSON.parse(r.data));}
async function withAvailability(db,products,admin){
  const kits=new Map((await list(db)).map(kit=>[kit.product,kit]));
  const today=localDay();
  return products.map(product=>{
    const kit=kits.get(product.id);
    if(!kit)return product;
    let available=product.stock;
    for(const component of kit.components){
      const units=component.lots.reduce((sum,lot)=>sum+(lot.expires>=today?lot.available:0),0);
      available=Math.min(available,Math.floor(units/component.perKit));
    }
    return admin ? {...product,available_stock:available} : {...product,stock:available};
  });
}
module.exports={receipt,move,list,withAvailability};
