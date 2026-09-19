import test from 'node:test';
import assert from 'node:assert/strict';
import { canEnterPortal } from '../src/access.js';

test('only active supported accounts enter the portal', () => {
    for (const user_type of ['admin', 'staff', 'accounts', 'manager']) {
        assert.equal(canEnterPortal({ user_type, status: 'active' }), true);
        for (const status of ['inactive', null, undefined, 'pending']) {
            assert.equal(canEnterPortal({ user_type, status }), false);
        }
    }
    for (const user_type of ['agent', 'dealer', 'channel_partner', 'vendor', 'sales', 'office', null, undefined]) {
        assert.equal(canEnterPortal({ user_type, status: 'active' }), false);
    }
    assert.equal(canEnterPortal(null), false);
});
