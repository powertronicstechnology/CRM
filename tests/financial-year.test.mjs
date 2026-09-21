import test from 'node:test';
import assert from 'node:assert/strict';
import {financialYear, customerYear, matchesPeriod, exportFilename} from '../src/financialYear.js';
test('financial years cross April in India, preserve old CRNs and keep months inside years',()=>{
 assert.equal(financialYear('2026-03-31'),2025);
 assert.equal(financialYear('2026-04-01'),2026);
 assert.equal(financialYear('2026-03-31T18:30:00Z'),2026);
 assert.equal(financialYear('2026-03-31T18:29:59Z'),2025);
 assert.equal(customerYear({date_of_registration:'2026-03-31',crn:'PT 26-27=1'}),2025);
 assert.equal(customerYear({crn:'PT 32-33=1'}),2032);
 assert.equal(customerYear({}),null);
 assert.equal(matchesPeriod({},'Unknown'),true);
 assert.equal(matchesPeriod({date_of_registration:'2027-03-12'},'2026','2'),true);
 assert.equal(matchesPeriod({date_of_registration:'2026-03-12'},'2026','2'),false);
 assert.equal(matchesPeriod({},'All','All'),true);
 assert.match(exportFilename('all','2026',new Date('2026-09-20T20:00:00Z')),/FY2026-27_Customers_Financial_2026-09-21.xlsx$/);
});
