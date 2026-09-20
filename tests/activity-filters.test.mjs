import test from 'node:test';
import assert from 'node:assert/strict';
import {activityCategories,matchesActivity} from '../src/activityFilters.js';
test('activity filters combine type and person and retain multi-section edits',()=>{
 const finance={action:'update',message:'Payments updated (Total: ₹7,799)',user_id:'one',profiles:{name:'Staff'}};
 assert.deepEqual(activityCategories(finance),['finance']);
 assert.equal(matchesActivity(finance,'finance','one'),true);
 assert.equal(matchesActivity(finance,'finance','two'),false);
 assert.equal(matchesActivity(finance,'stage','one'),false);
 assert.equal(matchesActivity({action:'stage_change',message:'Moved lead'},'stage'),true);
 const mixed={action:'update',message:'PHONE NUMBER: old → new | QUOTED AMOUNT: 1 → 2'};
 assert.equal(matchesActivity(mixed,'details'),true);assert.equal(matchesActivity(mixed,'finance'),true);
 assert.equal(matchesActivity({action:'update',message:'Subsidy received date updated'},'subsidy'),true);
 assert.equal(matchesActivity({action:'note',message:'Payment promised'},'note'),true);
 assert.equal(matchesActivity({action:'delete',message:'Deleted'},'delete'),true);
});
