import { useState } from 'react';
import { formatLogDate } from '../utils';
import { activityCategories, activityPerson, matchesActivity } from '../activityFilters.js';
const labels = {stage:'Stage changes',details:'Customer details',finance:'Financial',subsidy:'Subsidy',checklist:'Checklist',note:'Notes',create:'Created',delete:'Deleted',other:'Other'};
const colors = {stage:'bg-amber-50 text-amber-800',details:'bg-blue-50 text-blue-700',finance:'bg-emerald-50 text-emerald-800',subsidy:'bg-teal-50 text-teal-800',checklist:'bg-violet-50 text-violet-700',note:'bg-indigo-50 text-indigo-700',create:'bg-green-50 text-green-800',delete:'bg-rose-50 text-rose-700',other:'bg-stone-100 text-stone-700'};
export default function ActivityHistory({logs, limit=50, emptyText="No activity recorded yet."}) {
 const [type,setType]=useState('all'),[person,setPerson]=useState('all');
 const people=[...new Map(logs.map(log=>{const p=activityPerson(log);return [p.id,p];})).values()].sort((a,b)=>a.name.localeCompare(b.name));
 const filtered=logs.filter(log=>matchesActivity(log,type,person));
 return <div className="space-y-3">
  <div className="flex flex-wrap items-center gap-2">
   <select aria-label="Filter activity type" value={type} onChange={e=>setType(e.target.value)} className="bg-white border border-stone-200 rounded-lg px-3 py-2 text-sm"><option value="all">All activity</option>{Object.entries(labels).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select>
   <select aria-label="Filter activity by person" value={person} onChange={e=>setPerson(e.target.value)} className="bg-white border border-stone-200 rounded-lg px-3 py-2 text-sm"><option value="all">All people</option>{people.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select>
   {(type!=='all'||person!=='all')&&<button className="text-sm text-stone-600 underline px-2" onClick={()=>{setType('all');setPerson('all');}}>Clear filters</button>}
   <p className="text-xs text-stone-500 ml-auto">{filtered.length} of {logs.length} shown · latest {limit} entries</p>
  </div>
  <div className="space-y-3">
   {filtered.map(log=><article key={log.id} className="rounded-2xl border border-stone-200 bg-white px-5 py-4 shadow-sm">
    <div className="flex flex-wrap gap-2 items-center mb-3">
     {activityCategories(log).map(category=><span key={category} className={`rounded-full px-2.5 py-1 text-xs font-semibold ${colors[category]}`}>{labels[category]}</span>)}
    </div>
    <p className="text-sm font-normal text-stone-700 leading-5 whitespace-pre-wrap break-words">{(log.message||'Activity recorded').split(' | ').join('\n')}</p>
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-3 text-xs text-stone-500"><span>By {activityPerson(log).name}</span><time>{formatLogDate(log.created_at)}</time></div>
   </article>)}
   {!filtered.length&&<p className="p-5 text-sm text-stone-500">{logs.length?'No activity matches these filters.':emptyText}</p>}
  </div>
 </div>;
}
