'use strict';
const crypto = require('node:crypto');
const {createPasswordHash} = require('./password');
const fixtures = require('./demo-customer');

const digest = value => crypto.createHash('sha256').update(value).digest('hex');
const error = (status, message) => Object.assign(new Error(message), {status});

// A simulated mailbox is injected by the integration runner. No message, link
// or recovery secret is returned to the requesting HTTP client or console.
function accountMail(db, deliver) {
  async function issue(email, purpose) {
    if (!['verify','reset'].includes(purpose)) throw error(400,'Solicitud inválida');
    if (typeof deliver !== 'function') throw error(503,'El servicio de correo está pendiente de configuración.');
    const user = await db.prepare("SELECT id,email,role FROM users WHERE email=? AND role='customer'").get(email);
    if (!user || fixtures.matches(user,fixtures.automated) || fixtures.matches(user,fixtures.browser)) return;
    const code = crypto.randomBytes(32).toString('base64url');
    const key = 'account-mail:'+purpose+':'+user.id;
    const value = JSON.stringify({hash:digest(code),email:user.email,expires:Date.now()+900000});
    await db.prepare('INSERT INTO sync_state(k,v) VALUES(?,?) ON CONFLICT(k) DO UPDATE SET v=excluded.v').run(key,value);
    try { await deliver({to:user.email, purpose, code}); }
    catch { await db.prepare('DELETE FROM sync_state WHERE k=? AND v=?').run(key,value); throw error(503,'Entrega temporalmente indisponible.'); }
  }
  async function confirm(email,purpose,code,password) {
    if (!['verify','reset'].includes(purpose) || typeof code!=='string' || !/^[A-Za-z0-9_-]{43}$/.test(code)) throw error(400,'Código inválido o vencido');
    await db.transaction(async()=>{
      const user = await db.prepare("SELECT id,email,role FROM users WHERE email=? AND role='customer' FOR UPDATE").get(email);
      const key = 'account-mail:'+purpose+':'+user?.id;
      const row = user && await db.prepare('SELECT v FROM sync_state WHERE k=? FOR UPDATE').get(key);
      const saved = row && JSON.parse(row.v);
      if (!saved || saved.email!==email || saved.expires<=Date.now() || saved.hash!==digest(code)) throw error(400,'Código inválido o vencido');
      await db.prepare('DELETE FROM sync_state WHERE k=?').run(key);
      if (purpose==='verify') {
        await db.prepare('INSERT INTO sync_state(k,v) VALUES(?,?) ON CONFLICT(k) DO UPDATE SET v=excluded.v').run('verified-email:'+user.id,email);
      } else {
        let encoded;
        try { encoded = createPasswordHash(password); } catch { throw error(400,'La contraseña debe tener entre 12 y 256 caracteres'); }
        await db.prepare('UPDATE users SET password_hash=? WHERE id=?').run(encoded,user.id);
        await db.prepare('DELETE FROM sessions WHERE user_id=?').run(user.id);
      }
    });
  }
  return {issue,confirm};
}
module.exports = {accountMail};
