// Pending remarks are persisted in the existing stages_remarks JSON column.
const entries = record => Array.isArray(record.stages_remarks) ? record.stages_remarks : [];
export const savedStageNote = record => entries(record).find(entry => entry.pending === true) || null;
export function saveStageNotePatch(record, text, user, date = new Date().toISOString()) {
    const history = entries(record).filter(entry => entry.pending !== true);
    const trimmed = text.trim();
    return { stages_remarks: trimmed ? [...history, { text: trimmed, author: user.name, author_id: user.id, date, pending: true }] : history };
}
export function stageTransitionPatch(record, nextStage, label = nextStage, date = new Date().toISOString()) {
    const patch = { stage: nextStage };
    const note = savedStageNote(record);
    if (nextStage === record.stage || !note) return patch;
    const moved = { ...note, pending: false, stage: nextStage, stage_label: label, moved_at: date };
    const line = `${label}: ${note.text} — ${note.author || 'Staff'} (${new Date(date).toLocaleString('en-GB')})`;
    patch.internal_remarks = [record.internal_remarks, line].filter(Boolean).join('\n');
    patch.stages_remarks = entries(record).map(entry => entry === note ? moved : entry);
    return patch;
}
