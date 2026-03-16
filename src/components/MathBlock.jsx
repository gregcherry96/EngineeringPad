import React, { useEffect, useRef, useState } from 'react';
import 'mathlive';
import { sanitizeMath } from '../utils/mathSanitize';
import { useWorkspaceData } from '../WorkspaceContext';
import MathFieldWrapper from './MathFieldWrapper';
import {
  SHORTCUT_TEXT,
  SHORTCUT_SECTION,
  SHORTCUT_LEAVE_ESCAPE,
  SHORTCUT_LEAVE_ENTER,
  SHORTCUT_LEAVE_TAB,
  SHORTCUT_NUDGE_UP,
  SHORTCUT_NUDGE_DOWN,
  SHORTCUT_NUDGE_LEFT,
  SHORTCUT_NUDGE_RIGHT
} from '../utils/keyboardConfig';

const GRID_SIZE = 20;

function UnitEditor({ id, unitStr }) {
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
    <span className={`math-result-unit math-result-unit--clickable ms-1 ${unitOverrides[id] ? 'overridden' : ''}`} onClick={(e) => { e.stopPropagation(); setDraft(unitStr); setEditing(true); }} title="Change unit (Delete text to reset)">
      {unitStr}
    </span>
  );
}

export default function MathBlock({ id, initialValue, setFocus }) {
  const { results, actions, activeMathFieldRef } = useWorkspaceData();
  const resultData = results[id];
  const res = resultData ?? {};

  const [isStale, setIsStale] = useState(false);
  const mathFieldRef = useRef(null);
  const isTransforming = useRef(false);

  useEffect(() => {
    setIsStale(false);
  }, [resultData]);

  const handleInput = (e, mf) => {
    setIsStale(true);
    actions.change(id, sanitizeMath(mf.getValue('ascii-math')));
  };

  const handleFocusIn = (e, mf) => {
    setFocus(true);
    if (activeMathFieldRef) activeMathFieldRef.current = mf;
  };

  const handleFocusOut = (e, mf) => {
    setFocus(false);
    if (!mf.getValue() && !isTransforming.current) actions.delete(id);
  };

  const handleKeyDown = (e, mf) => {
    // Empty Field shortcuts (transforming blocks)
    if (!mf.getValue()) {
      if (SHORTCUT_TEXT.includes(e.key)) { e.preventDefault(); isTransforming.current = true; actions.transform(id, 'text'); return; }
      if (SHORTCUT_SECTION.includes(e.key)) { e.preventDefault(); isTransforming.current = true; actions.transform(id, 'section'); return; }
      if (e.key.startsWith('Arrow')) { e.preventDefault(); mf.blur(); actions.delete(id); actions.leaveBlock(id, e.key); return; }
    }

    // Standard Navigation
    if (e.key === SHORTCUT_LEAVE_ESCAPE) { e.preventDefault(); mf.blur(); actions.leaveBlock(id, 'Escape'); return; }
    if (e.key === SHORTCUT_LEAVE_ENTER) { e.preventDefault(); mf.blur(); actions.enter(id); return; }
    if (e.key === SHORTCUT_LEAVE_TAB) { e.preventDefault(); mf.blur(); actions.leaveBlock(id, e.shiftKey ? 'ShiftTab' : 'Tab'); return; }

    // Ctrl/Cmd + Arrow to Nudge
    if (e.key.startsWith('Arrow') && (e.ctrlKey || e.metaKey || !mf.getValue())) {
      e.preventDefault();
      const D = {
        [SHORTCUT_NUDGE_UP]: [0, -GRID_SIZE],
        [SHORTCUT_NUDGE_DOWN]: [0, GRID_SIZE],
        [SHORTCUT_NUDGE_LEFT]: [-GRID_SIZE, 0],
        [SHORTCUT_NUDGE_RIGHT]: [GRID_SIZE, 0]
      };
      actions.nudge(id, ...(D[e.key] ?? [0,0]));
    }
  };

  const copyToClipboard = (e) => {
    e.stopPropagation();
    const raw = res.numStr.replace(/\s×\s10/g, 'e').replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹⁻]/g, c => '⁰¹²³⁴⁵⁶⁷⁸⁹⁻'.indexOf(c).toString().replace('10',''));
    navigator.clipboard?.writeText(raw);
  };

  return (
    <>
      <MathFieldWrapper
        ref={mathFieldRef}
        style={{ minWidth: '30px' }}
        value={initialValue}
        onInput={handleInput}
        onFocusIn={handleFocusIn}
        onFocusOut={handleFocusOut}
        onKeyDown={handleKeyDown}
      />
      {res.numStr && !res.error && (
        <span className={`d-flex align-items-baseline gap-1 ms-2 transition-opacity duration-150 ${isStale ? 'opacity-50' : 'opacity-100'}`}>
          <span className="math-result-equals">=</span>
          <span className="math-result-num" onClick={copyToClipboard} title="Copy value">{res.numStr}</span>
          {res.unitStr && <UnitEditor id={id} unitStr={res.unitStr} />}
        </span>
      )}
      {res.error && (
        <span className={`badge bg-danger ms-2 transition-opacity duration-150 ${isStale ? 'opacity-50' : 'opacity-100'}`} title={res.errorMsg}>
          {res.errorLabel ?? 'error'}
        </span>
      )}
    </>
  );
}
