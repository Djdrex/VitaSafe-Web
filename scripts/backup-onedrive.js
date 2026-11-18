'use strict';
// Manual runner only. This file does not install a schedule or enable automatic syncing.
async function main(){
 if(!process.argv.includes('--confirm-manual')||process.env.VITASAFE_BACKUP_UPLOAD_ENABLED!=='true'||!process.env.DATABASE_URL)throw Error('Manual authorization required');
 const db=await require('../src/db/database').openDatabase(process.env,{initialize:false});
 try{
  const owner=await db.prepare("SELECT id,role FROM users WHERE role='admin'").get();
  const result=await require('../src/integrations/onedrive-backup').run(db,owner,process.env,{period:process.argv.includes('--weekly')?'Semanales':'Diarios'});
  console.log(JSON.stringify(result));
 }finally{await db.close()}
}
if(require.main===module)main().catch(()=>{console.error('Encrypted backup not verified. Check private destination, consent, keys and transport. No credentials logged.');process.exitCode=1});
module.exports={main};
