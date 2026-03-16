import React, { useState, useRef } from 'react';
import { useWorkspaceData } from '../WorkspaceContext';

export default function UnitEditor({ id, unitStr }) {
  const { rawResultsRef, unitOverrides, actions } = useWorkspaceData();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const inputRef = useRef(null);

  const commit = () => {
    const target = draft.trim();
    if (target !== unitStr) actions.unitChange(id, target);
    setEditing(false);
  };

  if (!rawResultsRef.current[id]) return unitStr ? <span className="math-result-unit ms-1">{unitStr}</span> : null;

  if (editing) {
    return (
      <input
        ref={inputRef}
        className="form-control form-control-sm font-monospace py-0 px-1 ms-1 d-inline-block"
        style={{width: '70px', height: '24px'}}
        value={draft} onChange={e => setDraft(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && commit()} onBlur={commit}
        autoFocus spellCheck={false} onClick={e => e.stopPropagation()}
      />
    );
  }

  return (
    <span
      className={`math-result-unit math-result-unit--clickable ms-1 ${unitOverrides[id] ? 'overridden' : ''}`}
      onClick={(e) => { e.stopPropagation(); setDraft(unitStr); setEditing(true); }}
      title="Change unit (Delete text to reset)"
    >
      {unitStr}
    </span>
  );
}
