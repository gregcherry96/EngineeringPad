import React, { useEffect, useRef, useState } from 'react';
import 'mathlive';
import { sanitizeMath } from '../utils/mathSanitize';
import { useWorkspace } from '../WorkspaceContext';

const GRID_SIZE = 20;

function UnitEditor({ id, unitStr }) {
  const { rawResultsRef, unitOverrides, actions } = useWorkspace();
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
  const { results, activeMathFieldRef, actions } = useWorkspace();
  const res = results[id] ?? {};

  const mathFieldRef = useRef(null);
  const isTransforming = useRef(false);
  const callbacks = useRef(actions);

  useEffect(() => { callbacks.current = actions; }, [actions]);

  useEffect(() => {
    const mf = mathFieldRef.current;
    if (!mf) return;

    if (initialValue && !mf.getValue()) {
      mf.setValue(initialValue);
      setTimeout(() => mf.focus(), 50);
    }

    const handleInput = () => callbacks.current.change(id, sanitizeMath(mf.getValue('ascii-math')));
    const handleFocusIn = () => { setFocus(true); if (activeMathFieldRef) activeMathFieldRef.current = mf; };
    const handleFocusOut = () => { setFocus(false); if (!mf.getValue() && !isTransforming.current) callbacks.current.delete(id); };

    const handleKeyDown = (e) => {
      // Empty Field shortcuts
      if (!mf.getValue()) {
        if (e.key === '"' || e.key === "'") { e.preventDefault(); isTransforming.current = true; callbacks.current.transform(id, 'text'); return; }
        if (e.key === '#') { e.preventDefault(); isTransforming.current = true; callbacks.current.transform(id, 'section'); return; }
        if (e.key.startsWith('Arrow')) { e.preventDefault(); mf.blur(); callbacks.current.delete(id); callbacks.current.leaveBlock(id, e.key); return; }
      }

      // Standard Navigation
      if (e.key === 'Escape') { e.preventDefault(); mf.blur(); callbacks.current.leaveBlock(id, 'Escape'); return; }
      if (e.key === 'Enter') { e.preventDefault(); mf.blur(); callbacks.current.enter(id); return; }
      if (e.key === 'Tab') { e.preventDefault(); mf.blur(); callbacks.current.leaveBlock(id, e.shiftKey ? 'ShiftTab' : 'Tab'); return; }

      // Ctrl/Cmd + Arrow to Nudge
      if (e.key.startsWith('Arrow') && (e.ctrlKey || e.metaKey || !mf.getValue())) {
        e.preventDefault();
        const D = { ArrowUp:[0,-GRID_SIZE], ArrowDown:[0,GRID_SIZE], ArrowLeft:[-GRID_SIZE,0], ArrowRight:[GRID_SIZE,0] };
        callbacks.current.nudge(id, ...(D[e.key] ?? [0,0]));
      }
    };

    mf.addEventListener('input', handleInput);
    mf.addEventListener('focusin', handleFocusIn);
    mf.addEventListener('focusout', handleFocusOut);
    mf.addEventListener('keydown', handleKeyDown);

    return () => {
      mf.removeEventListener('input', handleInput);
      mf.removeEventListener('focusin', handleFocusIn);
      mf.removeEventListener('focusout', handleFocusOut);
      mf.removeEventListener('keydown', handleKeyDown);
    };
  }, [id, initialValue, setFocus, activeMathFieldRef]);

  const copyToClipboard = (e) => {
    e.stopPropagation();
    const raw = res.numStr.replace(/\s×\s10/g, 'e').replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹⁻]/g, c => '⁰¹²³⁴⁵⁶⁷⁸⁹⁻'.indexOf(c).toString().replace('10',''));
    navigator.clipboard?.writeText(raw);
  };

  return (
    <>
      <math-field ref={mathFieldRef} style={{ minWidth: '30px' }} />
      {res.numStr && !res.error && (
        <span className="d-flex align-items-baseline gap-1 ms-2">
          <span className="math-result-equals">=</span>
          <span className="math-result-num" onClick={copyToClipboard} title="Copy value">{res.numStr}</span>
          {res.unitStr && <UnitEditor id={id} unitStr={res.unitStr} />}
        </span>
      )}
      {res.error && <span className="badge bg-danger ms-2" title={res.errorMsg}>{res.errorLabel ?? 'error'}</span>}
    </>
  );
}
