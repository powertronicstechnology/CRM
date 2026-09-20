import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

test('two-role SQL grants Staff finance while retaining Admin restrictions', async () => {
    const db = new PGlite();
    const read = path => fs.readFile(new URL(path, import.meta.url), 'utf8');
    const admin = '00000000-0000-0000-0000-000000000001';
    const staff = '00000000-0000-0000-0000-000000000002';
    try {
        await db.exec(await read('./schema-fixture.sql'));
        await db.query('INSERT INTO auth.users VALUES ($1),($2)', [admin, staff]);
        await db.query("INSERT INTO public.profiles(id,name,email,user_type,status) VALUES($1,'Admin','admin@example.test','admin','active')", [admin]);
        for (const name of ['20260919183528_admin_staff_subdivision.sql', '20260919192014_remove_partner_access.sql', '20260919192428_four_role_permissions.sql', '20260920113013_two_role_team_mode.sql']) {
            await db.exec(await read('../supabase/migrations/' + name));
        }
        await db.query("INSERT INTO public.profiles(id,name,email,user_type,role,status) VALUES($1,'Staff','staff@example.test','staff','Staff','active')", [staff]);
        await assert.rejects(db.query("UPDATE public.profiles SET user_type='manager',role='Manager' WHERE id=$1", [staff]), /constraint/);
        await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)", [staff]);
        await db.exec('SET ROLE authenticated');
        const rpc = async (action, id = null, payload = {}) => (await db.query('SELECT public.crm_records($1,$2,$3) AS data', [action,id,JSON.stringify(payload)])).rows[0].data;
        const record = await rpc('create', null, {customer_name:'Sample', stage:'REGISTRATION PENDING', quoted_amount:1000});
        await rpc('update',record.id,{payment_1:100,area:'West'});
        const rows = await rpc('list');
        assert.equal(Number(rows[0].payment_1),100);
        assert.equal(rows[0].area,'West');
        assert.equal('deleted_at' in rows[0],false);
        await assert.rejects(db.query('SELECT * FROM public.admin'), /permission denied/);
        await assert.rejects(rpc('trash',record.id), /Admin required/);
        assert.equal((await db.query('SELECT * FROM public.activity_log')).rows.length,0);
        await db.query("UPDATE public.profiles SET user_type='admin',role='Admin' WHERE id=$1",[staff]);
        assert.equal((await db.query('SELECT user_type FROM public.profiles WHERE id=$1',[staff])).rows[0].user_type,'staff');
        await db.exec('RESET ROLE');
        await db.query("UPDATE public.profiles SET status='inactive' WHERE id=$1",[staff]);
        await db.exec('SET ROLE authenticated');
        await assert.rejects(rpc('list'));
    } finally { await db.close(); }
});
