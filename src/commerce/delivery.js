'use strict';
const fail=(status,message)=>{throw Object.assign(new Error(message),{status});};
const time=v=>typeof v==='string' && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(v);

function config(input){
  if([input.fee_soles,input.opens,input.closes].every(v=>v==null||v==='')) return {};
  const raw=String(input.fee_soles??'').trim().replace(',','.');
  if(!/^\d{1,4}(\.\d{1,2})?$/.test(raw)) fail(400,'Ingresa la tarifa en soles con hasta dos decimales');
  if(!time(input.opens)||!time(input.closes)||input.opens>input.closes) fail(400,'Revisa las horas de inicio y fin de la zona');
  const [soles,cents='']=raw.split('.');
  return {fee:Number(soles)*100+Number(cents.padEnd(2,'0')),opens:input.opens,closes:input.closes};
}
function zone(row){
  if(!row)return null;
  const data=JSON.parse(row.data);
  if(data.status!=='published'||!Number.isSafeInteger(data.fee)||!time(data.opens)||!time(data.closes))return null;
  return {id:row.id,revision:row.revision,title:data.title,fee:data.fee,opens:data.opens,closes:data.closes};
}
async function options(db){
  return (await db.prepare("SELECT id,data,revision FROM platform_records WHERE kind='delivery' ORDER BY id").all()).map(zone).filter(Boolean);
}
function selection(input){
  if(input==null)return null;
  if(typeof input.id!=='string'||input.id.length>80||!Number.isSafeInteger(input.revision)||!time(input.time)||typeof input.date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) fail(400,'Selecciona una zona, fecha y hora válidas');
  return {id:input.id,revision:input.revision,date:input.date,time:input.time};
}
async function quote(db,selected){
  const current=zone(await db.prepare("SELECT id,data,revision FROM platform_records WHERE id=? AND kind='delivery' FOR UPDATE").get(selected.id));
  if(!current||current.revision!==selected.revision)fail(409,'La zona o la tarifa cambió. Actualiza la cotización');
  const civil=Date.parse(selected.date+'T00:00:00Z');
  if(!Number.isFinite(civil)||new Date(civil).toISOString().slice(0,10)!==selected.date)fail(400,'Fecha de entrega inválida');
  const requested=Date.parse(selected.date+'T'+selected.time+':00-05:00');
  if(requested<=Date.now()||selected.time<current.opens||selected.time>current.closes)fail(409,'Fecha u hora fuera del horario disponible de la zona');
  return {...current,date:selected.date,time:selected.time};
}
async function save(db,order,details){
  await db.prepare("INSERT INTO platform_records(id,kind,data,revision,updated) VALUES(?,'order_delivery',?,1,?)").run('order-delivery:'+order,JSON.stringify(details),Date.now());
}
module.exports={config,options,selection,quote,save};
