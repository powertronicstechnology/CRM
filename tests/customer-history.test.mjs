import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
test('Staff reads only requested active customer history; global log remains Admin-only',async()=>{
 const db=new PGlite();const read=p=>fs.readFile(new URL(p,import.meta.url),'utf8');
 const admin='00000000-0000-0000-0000-000000000001',staff='00000000-0000-0000-0000-000000000002';
 try {
  await db.exec(await read('./schema-fixture.sql'));
  await db.query('INSERT INTO auth.users VALUES ($1),($2)',[admin,staff]);
  await db.query("INSERT INTO public.profiles(id,name,email,user_type,status) VALUES($1,'Admin','a@test','admin','active')",[admin]);
  for(const file of ['20260919183528_admin_staff_subdivision.sql','20260919192014_remove_partner_access.sql','20260919192428_four_role_permissions.sql','20260920113013_two_role_team_mode.sql','20260920190424_customer_activity_history.sql']) await db.exec(await read('../supabase/migrations/'+file));
  await db.query("INSERT INTO public.profiles(id,name,email,user_type,role,status) VALUES($1,'Staff','s@test','staff','Staff','active')",[staff]);
  const one=(await db.query("INSERT INTO public.admin(customer_name) VALUES('Same name') RETURNING id")).rows[0].id;
  const two=(await db.query("INSERT INTO public.admin(customer_name) VALUES('Same name') RETURNING id")).rows[0].id;
  for(const [message,id] of [['Customer one',one],['Customer two',two],['Global action',null]]) await db.query("INSERT INTO public.activity_log(user_id,action,message,new_value) VALUES($1,'update',$2,$3)",[admin,message,id]);
  await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)",[staff]);await db.exec('SET ROLE authenticated');
  const history=async id=>(await db.query('SELECT public.customer_activity($1) AS data',[id])).rows[0].data;
  assert.deepEqual((await history(one)).map(x=>x.message),['Customer one']);
  assert.equal((await history(one))[0].profiles.name,'Admin');
  assert.equal((await db.query('SELECT * FROM public.activity_log')).rows.length,0);
  await assert.rejects(history(null),/Customer unavailable/);
  await db.exec('RESET ROLE');await db.query('UPDATE public.admin SET deleted_at=now() WHERE id=$1',[one]);await db.exec('SET ROLE authenticated');
  await assert.rejects(history(one),/Customer unavailable/);
  await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)",[admin]);
  assert.equal((await db.query('SELECT * FROM public.activity_log')).rows.length,3);
  assert.equal((await history(one)).length,1);
  await db.exec('RESET ROLE');await db.query("UPDATE public.profiles SET status='inactive' WHERE id=$1",[staff]);
  await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)",[staff]);await db.exec('SET ROLE authenticated');await assert.rejects(history(two),/Active account required/);
  await db.exec('RESET ROLE; SET ROLE anon');await assert.rejects(history(two),/permission denied/);
 }finally{await db.close();}
});
