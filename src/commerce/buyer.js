'use strict';
const crypto = require('node:crypto');
const core = require('./core');
const delivery = require('./delivery');
const digest = text => crypto.createHash('sha256').update(text).digest('hex');

async function handle(req,res,url,{db,user,environment,body,json,fail,throttle}) {
  if (!url.pathname.startsWith('/api/demo/buyer/')) return false;
  if (environment.DEMO_MODE!=='true' || environment.VITASAFE_TEST_ENV!=='true') fail(403,'Solo en el ensayo aislado');
  if (user && user.role!=='customer') fail(403,'Usa el laboratorio administrativo');
  const action=url.pathname.slice('/api/demo/buyer/'.length);
  const cookie=(req.headers.cookie||'').split(';').map(c=>c.trim()).find(c=>c.startsWith('vs_demo_guest='));
  let secret=cookie?.slice('vs_demo_guest='.length);
  if (!user && !/^[a-f0-9]{64}$/.test(secret||'')) {
    if (action!=='options' || req.method!=='GET') fail(401,'Abre el ensayo en este navegador');
    secret=crypto.randomBytes(32).toString('hex');
    res.setHeader('Set-Cookie','vs_demo_guest='+secret+'; HttpOnly; SameSite=Strict; Path=/api/demo/buyer; Max-Age=86400'+(environment.COOKIE_SECURE==='true'?'; Secure':''));
  }
  const customer='DEMO-BUYER-'+digest(user?'account:'+user.id:'guest:'+secret);
  const actor={role:'customer',id:customer};
  if (action==='options' && req.method==='GET') {
    json(res,200,{zones:await delivery.options(db)});return true;
  }
  if (action==='orders' && req.method==='GET') {
    const orders=await db.prepare('SELECT id,status,total,reservation_expires FROM commerce_orders WHERE customer_id=? ORDER BY created_at DESC LIMIT 40').all(customer);
    json(res,200,{orders});return true;
  }
  if (req.method!=='POST') fail(405,'Método no disponible');
  throttle(req,'demo-buyer');
  const input=await body(req);
  if (action==='cancel') {
    const o=await core.transition(db,input.id,'cancelled',actor);
    json(res,200,{id:o.id,status:o.status});return true;
  }
  if (action!=='checkout') fail(404,'Acción desconocida');
  if (input.confirm_fictional!==true || typeof input.key!=='string' || !/^[a-zA-Z0-9-]{12,120}$/.test(input.key)) fail(400,'Confirma el ensayo y su identificador');
  const key='buyer-'+digest(customer+':'+input.key);
  const order=await core.createOrder(db,{customer,items:input.items,key,catalogue:true,delivery:input.delivery,buyer:true},actor);
  json(res,order.reused?200:201,{id:order.id,total:order.total,status:order.status,fictional:true});return true;
}
async function expireBuyers(db,at=Date.now()){
  const rows=await db.prepare("SELECT id,customer_id FROM commerce_orders WHERE customer_id LIKE 'DEMO-BUYER-%' AND status='pending' AND payment_status='pending' AND reservation_expires<=? ORDER BY reservation_expires LIMIT 50").all(at);
  for(const row of rows){
    try {await core.transition(db,row.id,'cancelled',{id:row.customer_id,role:'customer'});}
    catch(err){if(err.status!==403 && err.status!==409)throw err;}
  }
}
module.exports={handle,expireBuyers};
