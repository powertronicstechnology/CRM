import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { quotationAmount, quotationMismatch, receivableAmount } from '../src/quotation.js';
import { exportSheets } from '../src/exportWorkbook.js';

test('Finance quote wins, including zero; blank falls back; exports retain originals', () => {
    for (const [finance, expected] of [[1200,1200],[0,0],[null,1000],['',1000],[undefined,1000]]) {
        const record = { quoted_amount:1000, quoted_amount_3:finance, total_received:200 };
        assert.equal(quotationAmount(record),expected);
        assert.equal(receivableAmount(record), Math.max(0,expected-200));
        for (const sheet of exportSheets([record],'admin')) {
            const cell = name => sheet.rows[0][sheet.columns.findIndex(c=>c.header===name)];
            assert.equal(cell('QUOTATION AMOUNT'),expected);
            assert.equal(cell('ORIGINAL QUOTATION'),1000);
            assert.equal(cell('FINANCE QUOTATION'),finance ?? '');
        }
    }
    assert.equal(quotationMismatch({quoted_amount:100,quoted_amount_3:'100'}),false);
    assert.equal(quotationMismatch({quoted_amount:100,quoted_amount_3:0}),true);
    assert.equal(quotationMismatch({quoted_amount:100,quoted_amount_3:null}),false);
});

test('SQL backfills and keeps balances consistent after quote and payment edits',async()=>{
 const db=new PGlite();
 try {
  await db.exec(await fs.readFile(new URL('./schema-fixture.sql',import.meta.url),'utf8'));
  await db.exec("INSERT INTO public.admin(customer_name,quoted_amount,quoted_amount_3,payment_1) VALUES('Mismatch',1000,1200,200),('Fallback',500,NULL,100),('Zero',500,0,100)");
  const sql=await fs.readFile(new URL('../supabase/migrations/20260920180136_unify_financial_quotation.sql',import.meta.url),'utf8');
  await db.exec(sql);
  const get=async name=>(await db.query('SELECT * FROM public.admin WHERE customer_name=$1',[name])).rows[0];
  let row=await get('Mismatch');
  assert.equal(Number(row.receivables),1000); assert.equal(Number(row.quoted_amount),1000); assert.equal(Number(row.quoted_amount_3),1200);
  assert.equal(Number((await get('Fallback')).receivables),400);
  assert.equal(Number((await get('Zero')).receivables),0);
  await db.exec("UPDATE public.admin SET quoted_amount=5000 WHERE customer_name='Mismatch'");
  assert.equal(Number((await get('Mismatch')).receivables),1000);
  await db.exec("UPDATE public.admin SET quoted_amount_3=1500 WHERE customer_name='Mismatch'");
  assert.equal(Number((await get('Mismatch')).receivables),1300);
  await db.exec("UPDATE public.admin SET payment_2=1400 WHERE customer_name='Mismatch'");
  row=await get('Mismatch');assert.equal(Number(row.receivables),0);assert.equal(Number(row.total_received),1600);
  await db.exec("UPDATE public.admin SET quoted_amount_3=2000 WHERE customer_name='Mismatch'");
  row=await get('Mismatch'); assert.equal(Number(row.receivables),400);assert.equal(row.financial_tag,null);
  await db.exec("UPDATE public.admin SET quoted_amount_3=NULL WHERE customer_name='Mismatch'");
  assert.equal(Number((await get('Mismatch')).receivables),3400);
  await db.exec(sql);assert.equal(Number((await get('Mismatch')).receivables),3400);
 } finally {await db.close();}
});
