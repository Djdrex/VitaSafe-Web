'use strict';
const {createPasswordHash,verifyPassword}=require('./password');
const browser={id:'DEMO-CLIENTE-NAVEGADOR',email:'premium-ensayo@example.invalid'};
const automated={id:'DEMO-FICTICIO-CLIENTE',email:'cliente-ficticio@example.invalid'};
function enabled(env){
  const secret=env.VITASAFE_TEST_CUSTOMER_PASSWORD;
  return env.DEMO_MODE==='true' && env.VITASAFE_TEST_ENV==='true' &&
    typeof secret==='string' && secret.length>=16 && secret.length<=256 && secret!==env.VITASAFE_ADMIN_PASSWORD;
}
function matches(user,fixture){return user?.role==='customer' && user.id===fixture.id && user.email===fixture.email;}
async function setup(db,env){
  if(env.DEMO_MODE!=='true'||env.VITASAFE_TEST_ENV!=='true')return;
  if(!enabled(env)){
    await db.prepare("DELETE FROM sessions WHERE user_id IN (SELECT id FROM users WHERE id=? AND email=? AND role='customer')").run(browser.id,browser.email);
    return;
  }
  await db.transaction(async()=>{
    const secret=env.VITASAFE_TEST_CUSTOMER_PASSWORD;
    if(db.kind!=='sqlite')await db.prepare('SELECT pg_advisory_xact_lock(hashtext(?))').get(browser.id);
    const row=await db.prepare('SELECT * FROM users WHERE id=? OR email=?').all(browser.id,browser.email);
    if(row.length===0){
      await db.prepare('INSERT INTO users(id,email,name,password_hash,role) VALUES(?,?,?,?,?)')
        .run(browser.id,browser.email,'Cliente ficticio de navegador',createPasswordHash(secret),'customer');
      return;
    }
    if(row.length!==1 || !matches(row[0],browser))throw Error('Conflicto de identidad en la cuenta de ensayo');
    if(!verifyPassword(secret,row[0].password_hash)){
      await db.prepare('UPDATE users SET password_hash=? WHERE id=?').run(createPasswordHash(secret),browser.id);
      await db.prepare('DELETE FROM sessions WHERE user_id=?').run(browser.id);
    }
  });
}
module.exports={browser,automated,enabled,matches,setup};
