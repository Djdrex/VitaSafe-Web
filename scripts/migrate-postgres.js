'use strict';
const {exportSQLite,loadBackup,restoreSQLite,importPostgres,verifyPostgres}=require('../src/db/migration');
async function main(){const [command,source,target,...flags]=process.argv.slice(2);
 if(command==='backup'){if(!source||!target)throw Error('Usage: backup SOURCE.sqlite NEW_BACKUP_DIRECTORY');console.log(JSON.stringify(await exportSQLite(source,target),null,2));return}
 if(command==='restore'){if(!source||!target)throw Error('Usage: restore BACKUP_DIRECTORY NEW.sqlite');console.log(JSON.stringify(restoreSQLite(source,target),null,2));return}
 if(!['import','verify'].includes(command)||!source||!target)throw Error('Usage: import|verify BACKUP_DIRECTORY vitasafe_stage_NAME [--apply]');
 const manifest=loadBackup(source);const apply=flags.includes('--apply');if(apply&&process.env.MIGRATION_ALLOW_WRITE!=='isolated-schema')throw Error('Explicit MIGRATION_ALLOW_WRITE=isolated-schema required for --apply');
 if(!process.env.MIGRATION_DATABASE_URL)throw Error('Set MIGRATION_DATABASE_URL securely; DATABASE_URL is deliberately ignored');
 const {Client}=require('pg');const client=new Client({connectionString:process.env.MIGRATION_DATABASE_URL,connectionTimeoutMillis:10000});await client.connect();try{const result=command==='verify'?await verifyPostgres(client,manifest,target):await importPostgres(client,manifest,target,{apply});console.log(JSON.stringify(result,null,2))}finally{await client.end()}}
main().catch(()=>{console.error('Migration stopped safely. Check configuration, schema drift, backup and integrity in a secure environment. No credentials or row contents are logged.');process.exitCode=1});
