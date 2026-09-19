import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import { transform } from 'esbuild';

const source = (await fs.readFile(new URL('../supabase/functions/add_user/index.ts', import.meta.url), 'utf8'))
    .replace(/^import .*$/gm, '');
const { code } = await transform(source, { loader: 'ts', target: 'es2022' });

function setup(profile, validToken = true) {
    let handler;
    const writes = [];
    const client = {
        auth: {
            getUser: async () => ({ data: { user: validToken ? { id: 'caller' } : null }, error: null }),
            admin: {
                createUser: async (data) => { writes.push(data); return { data: { user: { id: 'new-user' } }, error: null }; },
            },
            resetPasswordForEmail: async () => ({ error: null }),
        },
        from: () => ({
            select: () => ({ eq: () => ({ single: async () => ({ data: profile, error: null }) }) }),
            insert: async (data) => { writes.push(data); return { error: null }; },
        }),
    };
    vm.runInNewContext(code, {
        serve: (fn) => { handler = fn; }, createClient: () => client,
        Deno: { env: { get: () => 'test-only' } }, Response, console,
    });
    return { writes, request: (body, token = 'test-token') => handler(new Request('https://example.test/add_user', {
        method: 'POST', headers: token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : {},
        body: JSON.stringify(body),
    })) };
}

test('all management actions require a verified active Admin', async () => {
    for (const action of ['create', 'delete', 'deactivate', 'reactivate', 'update_email']) {
        for (const profile of [null, { user_type: 'office', status: 'active' }, { user_type: 'agent', status: 'active' }, { user_type: 'admin', status: 'inactive' }]) {
            const app = setup(profile);
            assert.equal((await app.request({ action })).status, 403);
            assert.equal(app.writes.length, 0);
        }
        const app = setup({ user_type: 'admin', status: 'active' });
        assert.equal((await app.request({ action }, '')).status, 401);
        assert.equal((await setup(null, false).request({ action })).status, 401);
    }
});

test('removed account types cannot be created, and arbitrary labels are not trusted', async () => {
    const app = setup({ user_type: 'admin', status: 'active' });
    for (const user_type of ['agent', 'dealer', 'channel_partner', 'vendor', 'sales', 'office', '__proto__', 'constructor']) {
        assert.equal((await app.request({ action: 'create', user_type })).status, 400);
    }
    assert.equal(app.writes.length, 0);
    assert.equal((await app.request({ action: 'create', user_type: 'staff', role: 'Channel Partners', name: 'Test', email: 'test@example.test', password: 'test-only-password' })).status, 200);
    assert.equal(app.writes[1].role, 'Staff');
    assert.equal(app.writes[1].status, 'active');
    for (const [user_type, role] of [['accounts','Accounts'],['manager','Manager'],['admin','Admin']]) {
        const created = setup({ user_type: 'admin', status: 'active' });
        assert.equal((await created.request({ action:'create', user_type, role:'untrusted', name:'Test', email:'test@example.test', password:'test-only-password' })).status,200);
        assert.equal(created.writes[1].role,role);
    }
});
