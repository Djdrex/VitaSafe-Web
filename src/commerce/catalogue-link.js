'use strict';
// Only invoked by the authenticated, isolated simulation route. No customer data is accepted.
const crypto=require('node:crypto');
const fail=(status,message)=>{throw Object.assign(Error(message),{status})};
const mapped=id=>'DEMO-CAT-'+crypto.createHash('sha256').update(id).digest('hex').slice(0,40);
async function ensure(db,source){
 const p=await db.prepare('SELECT * FROM products WHERE id=?').get(source);
 if(!p||!p.active||p.price<=0)fail(409,'Producto no publicado o sin precio');
 const id=mapped(source);
 await db.prepare('INSERT OR IGNORE INTO commerce_products(id,name,price,stock,initial_stock,fictional) VALUES(?,?,?,?,?,1)').run(id,p.name,p.price,p.stock,p.stock);
 await db.prepare("INSERT OR IGNORE INTO platform_records(id,kind,data,revision,updated) VALUES(?,'commerce_catalogue',?,1,?)").run('commerce-link:'+id,JSON.stringify({source}),Date.now());
 return id;
}
async function source(db,id){const r=await db.prepare("SELECT data FROM platform_records WHERE id=? AND kind='commerce_catalogue'").get('commerce-link:'+id);return r?JSON.parse(r.data).source:null;}
async function refresh(db,p,available=true){
 // Non-linked laboratory fixtures keep their existing behavior.
 if(!p.id.startsWith('DEMO-CAT-'))return p;
 const key=await source(db,p.id);if(!key)fail(409,'Referencia de catálogo ausente');
 const s=await db.prepare('SELECT * FROM products WHERE id=? FOR UPDATE').get(key);
 if(!s||(available&&(!s.active||s.price<=0)))fail(409,'Producto no publicado o sin precio');
 if(s.stock!==p.stock)await db.prepare('INSERT INTO commerce_movements(id,product_id,delta,reason,reference,actor,created_at) VALUES(?,?,?,?,?,?,?)').run(crypto.randomUUID(),p.id,s.stock-p.stock,'catalogue_adjustment',crypto.randomUUID(),'catalogue-sync',new Date().toISOString());
 await db.prepare('UPDATE commerce_products SET name=?,price=?,stock=? WHERE id=?').run(s.name,s.price>0?s.price:p.price,s.stock,p.id);
 return {...p,name:s.name,price:s.price,stock:s.stock};
}
async function move(db,id,delta,reason,reference,actor){
 if(!id.startsWith('DEMO-CAT-'))return;
 const key=await source(db,id);if(!key)fail(409,'Referencia de catálogo ausente');
 const p=await db.prepare('SELECT stock FROM products WHERE id=? FOR UPDATE').get(key);
 if(!p||p.stock+delta<0)fail(409,'Stock de catálogo insuficiente');
 await db.prepare('UPDATE products SET stock=stock+? WHERE id=?').run(delta,key);
 await db.prepare('INSERT INTO inventory_events(product_id,delta,reason,ref) VALUES(?,?,?,?)').run(key,delta,'Ensayo: '+reason,reference);
 await db.prepare("UPDATE platform_records SET revision=revision+1,updated=? WHERE id=? AND kind='product_meta'").run(Date.now(),'product:'+key);
 await db.prepare('INSERT INTO platform_audit(id,actor,action,ref,detail,created) VALUES(?,?,?,?,?,?)').run(crypto.randomUUID(),actor,'catalogue_simulation_stock',key,JSON.stringify({delta,reason,order:reference}),Date.now());
}
module.exports={mapped,ensure,refresh,move};
