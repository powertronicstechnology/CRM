import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {groupDropdowns,withCurrentOption} from '../src/dropdowns.js';
test('Operations options persist, removed defaults stay removed and only Admin writes', async()=>{
 const db=new PGlite();const read=p=>fs.readFile(new URL(p,import.meta.url),'utf8');
 const admin='00000000-0000-0000-0000-000000000001', staff='00000000-0000-0000-0000-000000000002';
 try{
 await db.exec(await read('./schema-fixture.sql'));
 await db.query('INSERT INTO auth.users VALUES ($1),($2)',[admin,staff]);
 await db.query("INSERT INTO profiles(id,name,email,user_type,status) VALUES($1,'Admin','admin@example.test','admin','active')",[admin]);
 for(const name of ['20260919183528_admin_staff_subdivision.sql','20260919192014_remove_partner_access.sql','20260919192428_four_role_permissions.sql','20260920113013_two_role_team_mode.sql','20260921090256_operations_dropdowns.sql']) await db.exec(await read('../supabase/migrations/'+name));
 await db.query("INSERT INTO profiles(id,name,email,user_type,role,status) VALUES($1,'Staff','staff@example.test','staff','Staff','active')",[staff]);
 await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)",[staff]);await db.exec('SET ROLE authenticated');
 assert.ok((await db.query('SELECT * FROM metadata')).rows.length);
 await assert.rejects(db.query("INSERT INTO metadata(category,label) VALUES('panel','Not allowed')"),/row-level security/);
 assert.equal((await db.query("DELETE FROM metadata WHERE category='panel' RETURNING *")).rows.length,0);
 await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)",[admin]);
 await db.query("DELETE FROM metadata WHERE category='panel' AND label='ADANI'");
 await db.query("INSERT INTO metadata(category,label) VALUES('panel','New Panel')");
 let meta=groupDropdowns((await db.query('SELECT * FROM metadata')).rows);
 assert.ok(meta.panel.includes('New Panel'));assert.ok(!meta.panel.includes('ADANI'));
 assert.deepEqual(withCurrentOption(meta.panel,'ADANI')[0],'ADANI');
 await db.exec('RESET ROLE');await db.exec(await read('../supabase/migrations/20260921090256_operations_dropdowns.sql'));
 meta=groupDropdowns((await db.query('SELECT * FROM metadata')).rows);assert.ok(!meta.panel.includes('ADANI'));
 await db.query("DELETE FROM metadata WHERE category='meter_phase'");assert.deepEqual(groupDropdowns((await db.query('SELECT * FROM metadata')).rows).meter_phase,[]);
 }finally{await db.close();}
});
