'use strict';
const crypto=require('node:crypto'),core=require('./core'),reports=require('./reports');
const {simulator}=require('./payments');
// Generated per process; never accepted from the browser or logged.
const signing=simulator(crypto.randomBytes(32).toString('hex'));
async function handle(req,res,url,{db,user,environment:env,body,json,fail}){
 if(!url.pathname.startsWith('/api/admin/simulation/'))return false;
 if(!user||user.role!=='admin')fail(401,'Inicia sesión como administrador');
 if(env.DEMO_MODE!=='true'||env.VITASAFE_TEST_ENV!=='true')fail(403,'Solo disponible en el entorno aislado de demostración');
 const namespace='DEMO-UI-'+crypto.createHash('sha256').update(user.id).digest('hex').slice(0,16),customer=namespace+'-customer';
 const action=url.pathname.slice('/api/admin/simulation/'.length),actor={id:user.id,role:'admin'};
 if(action==='state'&&req.method==='GET'){const products=await db.prepare('SELECT * FROM commerce_products WHERE id LIKE ? ORDER BY id').all(namespace+'-%'),orders=await db.prepare('SELECT * FROM commerce_orders WHERE customer_id=? ORDER BY created_at DESC').all(customer);json(res,200,{fictional:true,products,orders,summary:await reports.summary(db)});return true;}
 if(action==='report'&&req.method==='GET'){res.writeHead(200,{'Content-Type':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','Content-Disposition':'attachment; filename="VitaSafe_Informe_FICTICIO.xlsx"','Cache-Control':'no-store'});res.end(await reports.workbook(db));return true;}
 if(req.method!=='POST')fail(405,'Método no permitido');const b=await body(req);
 if(action==='prepare'){json(res,200,await core.fixtures(db,namespace));return true;}
 if(action==='checkout'){if(!Array.isArray(b.items)||b.items.some(i=>!String(i.id).startsWith(namespace+'-')))fail(400,'Solo productos del ensayo propio');json(res,201,await core.createOrder(db,{customer,items:b.items,key:b.key},actor));return true;}
 if(['payment','transition','return'].includes(action)){
 const order=await core.readOrder(db,b.orderId,{id:customer,role:'customer'});
 if(action==='payment'){if(!['approved','rejected','refunded'].includes(b.status))fail(400,'Resultado inválido');const payload={orderId:order.id,provider:'simulator',providerId:'sim-'+order.id,eventId:'sim-'+order.id+'-'+b.status,status:b.status,amount:order.total,currency:'PEN'};json(res,200,await core.applyPayment(db,signing.verify(signing.sign(payload))));}
 if(action==='transition')json(res,200,await core.transition(db,order.id,b.status,actor));
 if(action==='return')json(res,200,await core.returnStock(db,order.id,actor));return true;
 }
 if(action==='expire'){json(res,200,{expired:await core.expire(db)});return true;}
 fail(404,'Acción desconocida');
}
module.exports={handle};
