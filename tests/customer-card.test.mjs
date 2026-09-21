import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {build} from 'esbuild';
import React from 'react';
import Renderer,{act} from 'react-test-renderer';
test('stage controls save independently, preserve failures and keep finance permissions',async()=>{
 const dir=await fs.mkdtemp(new URL('./.card-',import.meta.url));let view; const oldDocument=globalThis.document; globalThis.document=Object.assign(new EventTarget(),{activeElement:null});
 try{
 await build({entryPoints:['src/components/CustomerCard.jsx'],outfile:dir+'/card.mjs',bundle:true,platform:'node',format:'esm',packages:'external',jsx:'automatic',plugins:[{name:'no-live',setup(b){b.onResolve({filter:/\/supabase$/},()=>({path:'fake',namespace:'fake'}));b.onLoad({filter:/.*/,namespace:'fake'},()=>({contents:'export const supabase={};'}));}}]});
 const {default:Card}=await import(dir+'/card.mjs');let opened=0,writes=0,fail=true;
 const customer={id:'sample',customer_name:'Sample',stage:'REGISTRATION DONE',quoted_amount:100,quoted_amount_3:200,total_received:50};
 const props={customer,canSeeFinance:true,onSelect:()=>opened++,onMoveStage:async()=>{writes++;if(fail)throw Error('test');}};
 await act(async()=>{view=Renderer.create(React.createElement(Card,props));});
 assert.match(JSON.stringify(view.toJSON()),/Receivable/);assert.match(JSON.stringify(view.toJSON()),/₹150/);
 const open=view.root.findByProps({'aria-label':'Open customer Sample'});
 await act(async()=>open.props.onClick());assert.equal(opened,1);
 const select=view.root.findByType('select'),save=view.root.findByProps({'aria-label':'Save stage'});
 assert.equal(save.props.disabled,false);
 const dialogButton=label=>view.root.findByProps({role:'alertdialog'}).findAllByType('button').find(node=>node.children.join('')===label);
 await act(async()=>save.props.onClick());assert.equal(writes,0);assert.match(JSON.stringify(view.toJSON()),/Documents Pending/);
 await act(async()=>dialogButton('Cancel').props.onClick());assert.equal(writes,0);assert.equal(view.root.findAllByProps({role:'alertdialog'}).length,0);
 await act(async()=>select.props.onChange({target:{value:'DOCUMENTS PENDING'}}));assert.equal(writes,0);assert.equal(opened,1);
 await act(async()=>save.props.onClick());assert.equal(writes,0);await act(async()=>dialogButton('Yes, change stage').props.onClick());assert.equal(writes,1);assert.ok(view.root.findAllByProps({role:'alert'}).length>0);assert.equal(select.props.value,'DOCUMENTS PENDING');
 fail=false;await act(async()=>dialogButton('Yes, change stage').props.onClick());assert.equal(writes,2);assert.equal(opened,1);assert.equal(view.root.findAllByProps({role:'alert'}).length,0);
 await act(async()=>view.update(React.createElement(Card,{...props,canSeeFinance:false,customer:{...customer,stage:'SUBSIDY AMOUNT DISBURSED'}})));
 assert.equal(view.root.findByProps({'aria-label':'Save stage'}).props.disabled,true);assert.doesNotMatch(JSON.stringify(view.toJSON()),/Receivable/);
 }finally{if(view)await act(async()=>view.unmount());globalThis.document=oldDocument;await fs.rm(dir,{recursive:true,force:true});}
});
