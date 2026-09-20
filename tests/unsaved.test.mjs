import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { build } from 'esbuild';
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';

const text = node => typeof node === 'string' ? node : (node.children || []).map(text).join('');
const button = (view, label) => view.root.findAllByType('button').reverse().find(node => text(node).trim().toLowerCase() === label.toLowerCase());
const prompt = view => view.root.findAll(node => node.props.role === 'alertdialog');
const click = async node => { assert.ok(node, 'button exists'); await act(async () => { await node.props.onClick(); }); };
const change = async (node, value) => { await act(async () => { node.props.onChange({target:{value}}); }); };

test('unsaved changes preserve forms and only leave after successful saves', async t => {
    const folder = await fs.mkdtemp(new URL('./.unsaved-', import.meta.url));
    const previousWindow = globalThis.window, previousDocument = globalThis.document;
    globalThis.window = new EventTarget();
    globalThis.document = Object.assign(new EventTarget(), { activeElement: null });
    let view;
    try {
        const outfile = `${folder}/components.mjs`;
        await build({stdin:{contents:"export {default as Lead} from './src/components/AddLeadModal.jsx'; export {default as Detail} from './src/components/CustomerDetailModal.jsx';",resolveDir:process.cwd()},outfile,bundle:true,platform:'node',format:'esm',packages:'external',jsx:'automatic',plugins:[{
            name:'no-live-data',setup(build){
                build.onResolve({filter:/\/supabase$/},()=>({path:'supabase',namespace:'fake'}));
                build.onLoad({filter:/.*/,namespace:'fake'},()=>({contents:"export const supabase = {rpc:async()=>({data:[],error:null}),from:()=>({select:()=>({or:()=>({order:()=>({limit:async()=>({data:[]})})})}),insert:async()=>({error:null})})};",loader:'js'}));
            }
        }]});
        const {Lead,Detail}=await import(outfile);
        const scenario = async (name, fn) => { try { await fn(); } catch (error) { error.message = name + ': ' + error.message; throw error; } };
        const render = async element => { if(view) await act(async()=>view.unmount()); await act(async()=>{view=TestRenderer.create(element);}); };
        await scenario('untouched lead closes immediately; dirty lead supports keep and leave', async()=>{
            let closed=0;
            await render(React.createElement(Lead,{onClose:()=>closed++,onSave:async()=>{},canSeeFinance:true}));
            await click(button(view,'Cancel')); assert.equal(closed,1);
            await change(view.root.findByProps({placeholder:'e.g. John Doe'}),'Draft Name');
            await click(button(view,'Cancel')); assert.equal(closed,1); assert.equal(prompt(view).length,1);
            await click(button(view,'Keep editing')); assert.equal(prompt(view).length,0);
            assert.equal(view.root.findByProps({placeholder:'e.g. John Doe'}).props.value,'Draft Name');
            const event=new Event('beforeunload',{cancelable:true}); Object.defineProperty(event,'returnValue',{value:'',writable:true}); window.dispatchEvent(event); assert.equal(event.defaultPrevented,true);
            await click(button(view,'Cancel')); await click(button(view,'Leave')); assert.equal(closed,2);
        });
        await scenario('invalid or failed lead save keeps draft; retry submits once',async()=>{
            let closed=0,calls=0,fail=true;
            await render(React.createElement(Lead,{onClose:()=>closed++,onSave:async()=>{calls++;if(fail)throw new Error('Save failed');},canSeeFinance:true}));
            await change(view.root.findByProps({placeholder:'e.g. John Doe'}),'Draft Name');
            await click(button(view,'Cancel')); await click(button(view,'Save and add lead'));
            assert.equal(calls,0); assert.equal(closed,0); assert.equal(prompt(view).length,1);
            await click(button(view,'Keep editing'));
            await change(view.root.findByProps({placeholder:'e.g. +91 9876543210'}),'9000000000');
            await click(button(view,'Cancel')); await click(button(view,'Save and add lead'));
            assert.equal(calls,1); assert.equal(closed,0); assert.equal(prompt(view).length,1);
            assert.equal(view.root.findByProps({placeholder:'e.g. John Doe'}).props.value,'Draft Name');
            fail=false; await click(button(view,'Save and add lead')); assert.equal(calls,2); assert.equal(closed,1);
        });
        const customer={id:'demo',customer_name:'Sample',stage:'REGISTRATION DONE',project_type:'General',project_checklist:[],payments:[],quoted_amount:1000,receivables:1000};
        const user={userType:'staff',name:'Staff',id:'staff'};
        await scenario('customer tab switch saves comment before navigating and preserves failed saves',async()=>{
            const writes=[];let fail=true;
            await render(React.createElement(Detail,{customer,user,onClose:()=>{},onUpdate:async(id,patch)=>{if(fail)throw new Error('Database unavailable');writes.push(patch);},onDelete:async()=>{}}));
            await change(view.root.findByProps({placeholder:'Note for this customer...'}),'Remember this');
            await click(button(view,'Finance & Bank')); assert.equal(prompt(view).length,1);
            assert.deepEqual(prompt(view)[0].findAllByType('button').map(text), ['Keep editing', 'Save and exit']);
            await click(button(view,'Save and exit')); assert.equal(prompt(view).length,1); assert.equal(writes.length,0);
            assert.equal(view.root.findByProps({placeholder:'Note for this customer...'}).props.value,'Remember this');
            fail=false; await click(button(view,'Save and exit')); assert.equal(writes.length,1); assert.match(writes[0].internal_remarks,/Remember this/);
            assert.equal(prompt(view).length,0); assert.ok(button(view,'Overview'));
            assert.ok(view.root.findAll(node=>node.props.placeholder==='Note for this customer...').length===0);
        });
        await scenario('customer fields are saved without unrelated stale fields',async()=>{
            const writes=[];let closed=0;
            await render(React.createElement(Detail,{customer,user,onClose:()=>closed++,onUpdate:async(id,patch)=>writes.push(patch),onDelete:async()=>{}}));
            await click(view.root.findAllByProps({title:'Edit Section'})[0]);
            const inputs=view.root.findAllByType('input');
            await change(inputs.find(node=>node.props.value==='Sample'),'Changed');
            await click(view.root.findByProps({'aria-label':'Close customer details'}));
            await click(button(view,'Save and exit'));
            assert.deepEqual(writes,[{customer_name:'Changed'}]);assert.equal(closed,1);
        });
        await scenario('checklist custom draft is saved with the pending navigation',async()=>{
            const writes=[];
            await render(React.createElement(Detail,{customer,user,onClose:()=>{},onUpdate:async(id,patch)=>writes.push(patch),onDelete:async()=>{}}));
            await click(button(view,'Checklist'));
            await change(view.root.findByProps({placeholder:'e.g. Verify solar net meter application...'}),'Inspect wiring');
            await click(button(view,'Overview')); assert.equal(prompt(view).length,1);
            await click(button(view,'Save and exit'));
            assert.equal(writes.length,1); assert.ok(writes[0].project_checklist.some(item=>item.label==='Inspect wiring'));
        });
        await scenario('Staff can see customer activity history in Notes and History',async()=>{
            await render(React.createElement(Detail,{customer,user,onClose:()=>{},onUpdate:async()=>{},onDelete:async()=>{}}));
            await click(button(view,'Notes & History'));
            assert.match(text(view.root),/Customer Activity History/);
            assert.match(text(view.root),/No activity recorded for this customer yet/);
        });
        await scenario('saved payment refreshes received and balance without reopening the customer',async()=>{
            function SavedCustomer() {
                const [record,setRecord]=React.useState({...customer,quoted_amount:190000,quoted_amount_3:190000,total_received:0,receivables:190000});
                return React.createElement(Detail,{customer:record,user,onClose:()=>{},onDelete:async()=>{},onUpdate:async(id,patch)=>{
                    const total=Array.from({length:5},(_,i)=>Number(patch[`payment_${i+1}`])||0).reduce((a,b)=>a+b,0);
                    setRecord(previous=>({...previous,...patch,total_received:total,receivables:190000-total,payment_reciept:'2026-09-21'}));
                }});
            }
            await render(React.createElement(SavedCustomer));
            await click(button(view,'Finance & Bank'));
            const amount=view.root.findAllByType('input').find(node=>node.props.placeholder==='Enter amount...');
            await change(amount,'7799');
            await click(button(view,'Save Payment 1'));
            const labels=view.root.findAllByType('p');
            const received=labels.find(node=>text(node)==='Received (Auto)').parent;
            const balance=labels.find(node=>text(node)==='Receivable (Auto)').parent;
            assert.match(text(received),/₹7,799/);
            assert.match(text(balance),/₹1,82,201/);
            assert.match(text(view.root),/7,799/);
        });
        await scenario('unsaved payment is protected when changing tabs',async()=>{
            const writes=[];
            await render(React.createElement(Detail,{customer,user,onClose:()=>{},onUpdate:async(id,patch)=>writes.push(patch),onDelete:async()=>{}}));
            await click(button(view,'Finance & Bank'));
            const amount=view.root.findAllByType('input').find(node=>node.props.placeholder?.toLowerCase().includes('amount') || node.props.placeholder==='0');
            assert.ok(amount,'new payment amount input');
            await change(amount,'250');
            await click(button(view,'Overview'));assert.equal(prompt(view).length,1);
            await click(button(view,'Save and exit'));assert.equal(prompt(view).length,0);
            assert.equal(writes[0].payment_1,250);
        });
    } finally {
        if(view) await act(async()=>view.unmount());
        globalThis.window=previousWindow;globalThis.document=previousDocument;
        await fs.rm(folder,{recursive:true,force:true});
    }
});
