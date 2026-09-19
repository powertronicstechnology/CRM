import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

test('four-role SQL enforces reads, writes, administration and inactive sessions', async () => {
    const db = new PGlite();
    try {
        await db.exec(await fs.readFile(new URL('./schema-fixture.sql', import.meta.url), 'utf8'));
        const ids = Object.fromEntries(['admin','staff','accounts','manager','inactive'].map((r,i) => [r, `00000000-0000-0000-0000-00000000000${i+1}`]));
        await db.query('INSERT INTO auth.users VALUES ($1)', [ids.admin]);
        await db.query("INSERT INTO public.profiles(id,name,email,user_type,status) VALUES($1,'Admin','admin@example.test','admin','active')", [ids.admin]);
        await db.exec(await fs.readFile(new URL('../supabase/migrations/20260919183528_admin_staff_subdivision.sql', import.meta.url), 'utf8'));
        await db.exec(await fs.readFile(new URL('../supabase/migrations/20260919192014_remove_partner_access.sql', import.meta.url), 'utf8'));
        await db.exec(await fs.readFile(new URL('../supabase/migrations/20260919192428_four_role_permissions.sql', import.meta.url), 'utf8'));
        for (const role of ['staff','accounts','manager','inactive']) {
            const type = role === 'inactive' ? 'staff' : role;
            await db.query('INSERT INTO auth.users VALUES ($1)', [ids[role]]);
            await db.query("INSERT INTO public.profiles(id,name,email,user_type,role,status) VALUES($1,$2,$2 || '@example.test',$3,$4,$5)",
                [ids[role], role, type, type[0].toUpperCase()+type.slice(1), role === 'inactive' ? 'inactive' : 'active']);
        }
        const record = '10000000-0000-0000-0000-000000000001';
        await db.query("INSERT INTO public.admin(id,customer_name,full_installation_address,stage,payment_1,quoted_amount,quoted_amount_3) VALUES($1,'Customer','Private address','REGISTRATION DONE',100,1000,1500)", [record]);
        async function as(role) {
            await db.exec('RESET ROLE');
            await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)", [ids[role] || '']);
            await db.exec(`SET ROLE ${role === 'anon' ? 'anon' : 'authenticated'}`);
        }
        async function rpc(action, id = null, payload = {}) {
            return (await db.query('SELECT public.crm_records($1,$2,$3) AS data', [action,id,JSON.stringify(payload)])).rows[0].data;
        }
        for (const role of ['staff','accounts','manager','admin']) {
            await as(role);
            await assert.rejects(db.query('SELECT * FROM public.admin'), /permission denied/);
            const rows = await rpc('list');
            assert.equal(rows.length,1);
            assert.equal(rows[0].customer_name,'Customer');
            assert.equal('full_installation_address' in rows[0],role !== 'accounts');
            assert.equal('payment_1' in rows[0],role !== 'staff');
            assert.equal('deleted_at' in rows[0],role === 'admin');
            assert.equal('quoted_amount' in rows[0],true); // Customer-sheet summary, read-only for Staff.
        }
        await as('staff');
        await rpc('update',record,{area:'Allowed CRM edit'});
        await assert.rejects(rpc('update',record,{payment_1:999}), /not writable/);
        await assert.rejects(rpc('update',record,{quoted_amount:999}), /not writable/);
        await assert.rejects(rpc('update',record,{deleted_at:null}), /not writable/);
        await assert.rejects(rpc('update',record,{"area = 'attack' --":'no'}), /not writable/);
        const newRecord = await rpc('create',null,{customer_name:'New lead',stage:'REGISTRATION PENDING'});
        assert.ok(newRecord.id);
        await db.query("UPDATE public.profiles SET user_type='admin',role='Admin' WHERE id=$1",[ids.staff]);
        assert.equal((await db.query('SELECT user_type FROM public.profiles WHERE id=$1',[ids.staff])).rows[0].user_type,'staff');
        assert.equal((await db.query('SELECT * FROM public.activity_log')).rows.length,0);
        await assert.rejects(db.query("INSERT INTO public.activity_log(user_id,action,message) VALUES($1,'update','spoof')",[ids.admin]), /row-level security/);
        await assert.rejects(rpc('trash',record), /Admin required/);

        await as('accounts');
        assert.equal((await rpc('list')).find(r=>r.id===record).receivables,900, 'CRM edits must not recalculate financial values');
        await rpc('update',record,{payment_1:200});
        await assert.rejects(rpc('update',record,{area:'no'}), /not writable/);
        await assert.rejects(rpc('create',null,{customer_name:'no'}), /CRM access/);
        await as('manager');
        const saved=await rpc('update',record,{area:'Manager CRM',payment_2:100});
        assert.equal(saved.area,'Manager CRM');
        assert.equal(saved.total_received,300);
        await assert.rejects(rpc('delete',record), /Admin required/);
        assert.equal((await db.query('SELECT * FROM public.activity_log')).rows.length,0);

        await as('inactive');
        await assert.rejects(rpc('list'), /active supported/);
        await assert.rejects(rpc('update',record,{area:'no'}), /active supported/);
        await as('anon');
        await assert.rejects(rpc('list'), /permission denied/);
        await as('admin');
        await assert.rejects(db.query("UPDATE public.profiles SET user_type='staff',role='Staff' WHERE id=$1",[ids.admin]), /last active Admin/);
        await rpc('trash',record);
        assert.ok((await rpc('list')).find(r=>r.id===record).deleted_at);
        await as('staff');
        assert.equal((await rpc('list')).some(r=>r.id===record),false);
        await assert.rejects(rpc('update',record,{area:'no'}), /unavailable/);
        await as('admin');
        await rpc('restore',record);
        assert.equal((await rpc('list')).find(r=>r.id===record).deleted_at,null);
        assert.ok((await db.query('SELECT * FROM public.activity_log')).rows.length>0);
        await db.exec('RESET ROLE');
        await db.query("UPDATE public.profiles SET status='inactive' WHERE id=$1",[ids.staff]);
        await as('staff'); // Same identity/token, but latest profile is inactive.
        await assert.rejects(rpc('list'), /active supported/);
    } finally { await db.close(); }
});
