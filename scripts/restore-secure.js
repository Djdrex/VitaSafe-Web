'use strict';
// Restore only to an explicitly selected empty PostgreSQL target. Never print connection strings.
const fs=require('node:fs/promises'),crypto=require('node:crypto');
function targetIdentity(value){const u=new URL(value);if(!['postgres:','postgresql:'].includes(u.protocol))throw Error('PostgreSQL required');return u.hostname.toLowerCase()+':'+(u.port||'5432')+decodeURIComponent(u.pathname);}
async function main(){
 const file=process.argv[2],target=process.env.VITASAFE_RESTORE_DATABASE_URL;
 if(!file||!process.argv.includes('--confirm-empty-target')||!target)throw Error('Explicit empty target required');
 if(process.env.DATABASE_URL&&targetIdentity(target)===targetIdentity(process.env.DATABASE_URL))throw Error('Source and target must differ');
 targetIdentity(target);
 const encrypted=await fs.readFile(file),plain=require('../src/backup-secure').decrypt(encrypted,process.env.VITASAFE_BACKUP_KEY);
 const db=await require('../src/db/database').openDatabase({DATABASE_URL:target});
 try{const result=await require('../src/db/recovery').restoreEmpty(db,plain);console.log(JSON.stringify({restored:result.restored,counts:result.counts,encrypted_sha256:crypto.createHash('sha256').update(encrypted).digest('hex')}));}finally{await db.close()}
}
if(require.main===module)main().catch(()=>{console.error('Restore refused or failed. Verify the separate empty target, encrypted file and secure key configuration. No secrets logged.');process.exitCode=1});
module.exports={targetIdentity};
