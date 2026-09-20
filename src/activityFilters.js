// Historic entries store their change descriptions in message rather than a category.
// An edit can affect multiple sections and should appear under each relevant filter.
export function activityCategories(log) {
 const action=(log.action||'').toLowerCase(), message=(log.message||'').toLowerCase();
 const categories=[];
 if(action==='stage_change'||/\bstage\s*[:→]|stage changed/.test(message))categories.push('stage');
 if(/payment|quot(?:ation|ed)|receiv|financial|bank|ifsc|bill no|account number|project type/.test(message))categories.push('finance');
 if(/subsidy/.test(message))categories.push('subsidy');
 if(/checklist|checked|unchecked/.test(message))categories.push('checklist');
 if(action==='note')categories.push('note');
 if(action==='create'||action==='delete')categories.push(action);
 if(/customer name|phone|mobile|address|area:|panel|inverter|capacity|consumer|application|subdivision|meter phase|registration date/.test(message))categories.push('details');
 if(!categories.length)categories.push(action==='update'?'details':'other');
 return categories;
}
export function activityPerson(log){return {id:log.user_id||log.profiles?.name||'system',name:log.profiles?.name||'System'};}
export function matchesActivity(log,type='all',person='all') {
 return (type==='all'||activityCategories(log).includes(type))&&(person==='all'||activityPerson(log).id===person);
}
