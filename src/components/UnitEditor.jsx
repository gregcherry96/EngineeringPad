import React, { useState, useRef } from 'react';
import { useWorkspaceData, useWorkspaceActionData } from '../WorkspaceContext';

export default function UnitEditor({ id, unitStr, isError }) {
  // Step 1: Pull state from data context, but actions from action context
  const { rawResultsRef, unitOverrides } = useWorkspaceData();
  const { actions } = useWorkspaceActionData();

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const inputRef = useRef(null);

  // Step 3: Display the user's broken override if in an error state
  const displayStr = isError ? (unitOverrides[id] || unitStr) : unitStr;

  const commit = () => {
    const target = draft.trim();
    if (target !== (unitOverrides[id] || unitStr)) actions.unitChange(id, target);
    setEditing(false);
  };

  if (!rawResultsRef.current[id] && !isError) {
    return displayStr ? <span className="math-result-unit ms-1">{displayStr}</span> : null;
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        className={`form-control form-control-sm font-monospace py-0 px-1 ms-1 d-inline-block ${isError ? 'text-danger border-danger' : ''}`}
        style={{ width: '70px', height: '24px' }}
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && commit()}
        onBlur={commit}
        autoFocus
        spellCheck={false}
        onClick={e => e.stopPropagation()}
      />
    );
  }

  return (
    <span
      className={`math-result-unit math-result-unit--clickable ms-1 ${unitOverrides[id] ? 'overridden' : ''} ${isError ? 'text-danger fw-bold' : ''}`}
      onClick={(e) => { e.stopPropagation(); setDraft(displayStr); setEditing(true); }}
      title={isError ? "Invalid unit (Click to fix)" : "Change unit (Delete text to reset)"}
    >
      {displayStr}
    </span>
  );
}
