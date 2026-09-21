import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { build } from 'esbuild';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { permissionsFor } from '../src/access.js';

test('navigation and customer detail tabs match each role', async () => {
    const directory = await fs.mkdtemp(new URL('./.role-ui-', import.meta.url));
    try {
        const outfile = `${directory}/components.mjs`;
        await build({
            stdin: { contents: "export {default as Dashboard} from './src/components/Dashboard.jsx'; export {default as Detail} from './src/components/CustomerDetailModal.jsx'; export {default as Overview} from './src/components/DashboardView.jsx';", resolveDir: process.cwd() },
            outfile, bundle:true, platform:'node', format:'esm', packages:'external', jsx:'automatic',
            define: { 'import.meta.env.VITE_SUPABASE_URL': '"https://example.test"', 'import.meta.env.VITE_SUPABASE_ANON_KEY': '"test-only"' },
        });
        const { Dashboard, Detail, Overview } = await import(outfile);
        for (const role of ['staff','admin']) {
            const user = { id:'test', userType:role, name:'Test', role };
            const access = permissionsFor(role);
            const nav = renderToStaticMarkup(createElement(Dashboard,{user,onLogout:()=>{}}));
            assert.equal(nav.includes('Activity Log'),access.admin);
            assert.equal(nav.includes('User Management'),access.admin);
            assert.equal(nav.includes('Trash'),access.admin);
            assert.equal(nav.includes('Project Stages'),access.crm);
            assert.equal(nav.includes('Add Lead'),access.crm);
            assert.equal(nav.includes('PM Surya Ghar'),access.finance);
            const customer = { id:'one', customer_name:'Test', stage:'REGISTRATION DONE', project_checklist:[] };
            const detail = renderToStaticMarkup(createElement(Detail,{customer,user,onClose:()=>{},onUpdate:()=>{},onDelete:()=>{}}));
            assert.equal(detail.includes('Finance &amp; Bank'),access.finance);
            assert.equal(detail.includes('Overview</button>'),access.crm);
            assert.equal(detail.includes('Checklist</button>'),access.crm);
            const dashboard = renderToStaticMarkup(createElement(Overview,{customers:[customer],loading:false,access}));
            assert.equal(dashboard.includes('Cash Collected'),access.finance);
            assert.equal(dashboard.includes('Operational Density'),access.crm);
        }
    } finally { await fs.rm(directory,{recursive:true,force:true}); }
});
