'use strict';
// Controlled editor of the existing catalogue; never enables checkout or payments.
const crypto=require('node:crypto');
const categories=['Universitario','Vehicular','Aventura: caminatas y ciclismo','Oficina','Rural','Mascotas','Familiar de emergencia'];
const fail=(status,message)=>{throw Object.assign(Error(message),{status})};
const str=(v,max)=>{if(typeof v!=='string'||v.length>max)fail(400,'Texto de producto inválido');return v.trim()};
const integer=(v,max=100000000)=>{const n=Number(v);if(v===''||v===null||v===undefined||!Number.isSafeInteger(n)||n<0||n>max)fail(400,'Importe o cantidad inválidos');return n};
function image(v){const s=str(v||'',1400000);if(!s)return '';const m=s.match(/^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/);if(!m)fail(400,'Carga una fotografía PNG, JPG o WebP');require('./platform').validateAsset(m[1],m[2]);return s;}
async function list(db){const rows=await db.prepare('SELECT * FROM products ORDER BY rowid').all();const meta=await db.prepare("SELECT id,data,revision FROM platform_records WHERE kind='product_meta'").all();return rows.map(p=>{const r=meta.find(r=>r.id==='product:'+p.id),d=r?JSON.parse(r.data):{};return {...p,cost:d.cost??null,dimensions:d.dimensions||'',weight:d.weight??null,maintenance:d.maintenance||'',replacement:d.replacement||'',additional:d.additional||'',revision:r?.revision||0};});}
async function save(db,b,actor){if(actor?.role!=='admin')fail(403,'Permiso administrativo requerido');const key=b.id?str(b.id,80):crypto.randomUUID();if(!/^[A-Za-z0-9_-]+$/.test(key))fail(400,'Identificador inválido');
 const p={name:str(b.name,100),description:str(b.description||'',2000),category:str(b.category||'',80),slug:str(b.slug||key,100),price:integer(b.price),stock:integer(b.stock),contents:str(b.contents||'',4000),image:image(b.image),active:b.active===true?1:0};if(!p.name||!p.slug||!p.category)fail(400,'Nombre, categoría y slug requeridos');
 const d={cost:b.cost===''||b.cost===null||b.cost===undefined?null:integer(b.cost),weight:b.weight===''||b.weight===null||b.weight===undefined?null:integer(b.weight),dimensions:str(b.dimensions||'',200),maintenance:str(b.maintenance||'',2000),replacement:str(b.replacement||'',2000),additional:str(b.additional||'',4000)};
 return db.transaction(async()=>{if(db.kind!=='sqlite')await db.prepare('SELECT pg_advisory_xact_lock(hashtext(?))').get('catalogue:'+key);
 const old=await db.prepare('SELECT * FROM products WHERE id=? FOR UPDATE').get(key),meta=await db.prepare('SELECT revision FROM platform_records WHERE id=?').get('product:'+key);
 if(b.revision!==undefined&&Number(b.revision)!==(meta?.revision||0))fail(409,'El producto cambió; vuelve a cargarlo');if(old&&b.revision===undefined)fail(409,'Recarga el producto antes de editarlo');
 const duplicate=await db.prepare('SELECT id FROM products WHERE slug=? AND id<>?').get(p.slug,key);if(duplicate)fail(409,'El slug ya pertenece a otro producto');
 const cols=Object.keys(p);if(old)await db.prepare('UPDATE products SET '+cols.map(k=>k+'=?').join(',')+' WHERE id=?').run(...Object.values(p),key);else await db.prepare('INSERT INTO products(id,'+cols.join(',')+') VALUES('+Array(cols.length+1).fill('?').join(',')+')').run(key,...Object.values(p));
 const delta=p.stock-(old?.stock||0);if(delta)await db.prepare('INSERT INTO inventory_events(product_id,delta,reason,ref) VALUES(?,?,?,?)').run(key,delta,'Ajuste administrativo en entorno de pruebas',actor.id);
 await db.prepare("INSERT INTO platform_records(id,kind,data,revision,updated) VALUES(?,'product_meta',?,?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data,revision=excluded.revision,updated=excluded.updated").run('product:'+key,JSON.stringify(d),(meta?.revision||0)+1,Date.now());
 await db.prepare('INSERT INTO platform_audit(id,actor,action,ref,detail,created) VALUES(?,?,?,?,?,?)').run(crypto.randomUUID(),actor.id,old?'catalogue_updated':'catalogue_created',key,JSON.stringify({stock_delta:delta,published:!!p.active}),Date.now());return {id:key,revision:(meta?.revision||0)+1};});}
module.exports={categories,list,save};
