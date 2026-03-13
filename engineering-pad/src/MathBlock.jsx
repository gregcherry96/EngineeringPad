import React, { useEffect, useRef, useState, useCallback } from 'react';
import 'mathlive';
import { sanitizeMath, sanitizeMathDebug } from './sanitizeMath';

const GRID_SIZE = 20;

// Common units for autocomplete suggestions
const UNIT_SUGGESTIONS = [
  // Force/mass/acceleration
  'N','kN','MN','kg','g','mg','lb','lbf','ton',
  // Energy/power
  'J','kJ','MJ','W','kW','MW','eV','cal','kcal','kWh','BTU',
  // Pressure
  'Pa','kPa','MPa','GPa','bar','mbar','atm','psi','mmHg',
  // Length
  'm','km','cm','mm','um','nm','ft','in','mi','yd',
  // Time
  's','ms','us','ns','min','h','hr','day',
  // Velocity
  'm/s','km/h','mph','kn',
  // Temperature
  'K','degC','degF',
  // Electricity
  'V','mV','kV','A','mA','kA','ohm','kohm','Mohm','F','uF','nF','pF','H','mH','uH',
  // Frequency
  'Hz','kHz','MHz','GHz',
  // Angle
  'rad','deg',
  // Area/volume
  'm^2','cm^2','km^2','m^3','cm^3','L','mL',
  // Misc
  'mol','cd','lm','lx',
];

// ─── Unit autocomplete dropdown ───────────────────────────────────────────────
function UnitAutocomplete({ draft, onSelect }) {
  if (!draft.trim()) return null;
  const q = draft.toLowerCase();
  const matches = UNIT_SUGGESTIONS.filter(u => u.toLowerCase().startsWith(q) && u.toLowerCase() !== q).slice(0, 6);
  if (!matches.length) return null;
  return (
    <div className="unit-autocomplete">
      {matches.map(u => (
        <button key={u} className="unit-autocomplete-item" onMouseDown={e => { e.preventDefault(); onSelect(u); }}>
          {u}
        </button>
      ))}
    </div>
  );
}

// ─── Inline unit editor ───────────────────────────────────────────────────────
function UnitEditor({ id, unitStr, unitIsOverridden, hasUnitResult, onUnitChange, onUnitReset }) {
  const [editing, setEditing]   = useState(false);
  const [draft, setDraft]       = useState('');
  const [flashErr, setFlashErr] = useState(false);
  const inputRef = useRef(null);

  const startEdit = useCallback(e => {
    e.stopPropagation();
    setDraft(unitStr ?? '');
    setEditing(true);
    setTimeout(() => inputRef.current?.select(), 10);
  }, [unitStr]);

  const commit = useCallback(() => {
    const target = draft.trim();
    if (!target || (target === unitStr && !unitIsOverridden)) { setEditing(false); return; }
    const res = onUnitChange(id, target);
    if (res?.ok === false) {
      setFlashErr(true);
      setTimeout(() => setFlashErr(false), 1200);
    } else {
      setEditing(false);
    }
  }, [draft, id, unitStr, unitIsOverridden, onUnitChange]);

  const handleKey = useCallback(e => {
    e.stopPropagation();
    if (e.key === 'Enter')  { e.preventDefault(); commit(); }
    if (e.key === 'Escape') { setEditing(false); }
  }, [commit]);

  if (!hasUnitResult) return unitStr ? <span className="math-result-unit">{unitStr}</span> : null;

  if (editing) {
    return (
      <span className="unit-editor" onClick={e => e.stopPropagation()}>
        <span className="unit-input-wrap">
          <input
            ref={inputRef}
            className={`unit-input${flashErr ? ' unit-input--error' : ''}`}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={handleKey}
            onBlur={commit}
            placeholder="e.g. kJ, mph"
            spellCheck={false}
          />
          <UnitAutocomplete draft={draft} onSelect={u => { setDraft(u); setTimeout(commit, 50); }} />
        </span>
        {flashErr && <span className="unit-input-errmsg">incompatible unit</span>}
      </span>
    );
  }

  return (
    <span className="unit-editor">
      <span
        className={`math-result-unit math-result-unit--clickable${unitIsOverridden ? ' overridden' : ''}`}
        onClick={startEdit}
        title="Click to change unit"
      >
        {unitStr}
      </span>
      {unitIsOverridden && (
        <button className="unit-reset-btn" onClick={e => { e.stopPropagation(); onUnitReset(id); }} title="Reset to auto unit">↺</button>
      )}
    </span>
  );
}

// ─── Copy feedback ────────────────────────────────────────────────────────────
function CopyableNum({ numStr }) {
  const [copied, setCopied] = useState(false);

  const handleClick = useCallback(e => {
    e.stopPropagation();
    const raw = numStr.replace(/\s×\s10/g, 'e').replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹⁻]/g, c =>
      '⁰¹²³⁴⁵⁶⁷⁸⁹⁻'.indexOf(c).toString().replace('10','')
    );
    navigator.clipboard?.writeText(raw).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  }, [numStr]);

  return (
    <span
      className={`math-result-num${copied ? ' copied' : ''}`}
      onClick={handleClick}
      title="Click to copy value"
    >
      {copied ? '✓ copied' : numStr}
    </span>
  );
}

// ─── Main MathBlock ───────────────────────────────────────────────────────────
export default function MathBlock({
  id, initialValue,
  numStr, unitStr, hasError, errorLabel, errorMsg,
  hasUnitResult, unitIsOverridden,
  activeMathFieldRef,
  setFocus, onDelete, onChange, onEnter, onNudge, onTransform,
  onUnitChange, onUnitReset,
}) {
  const mathFieldRef   = useRef(null);
  const isTransforming = useRef(false);
  const callbacks      = useRef({ onDelete, onChange, onEnter, onNudge, onTransform });
  const [showTip, setShowTip] = useState(false);

  useEffect(() => { callbacks.current = { onDelete, onChange, onEnter, onNudge, onTransform }; },
    [onDelete, onChange, onEnter, onNudge, onTransform]);

  useEffect(() => {
    const mf = mathFieldRef.current;
    if (!mf) return;

    if (initialValue && mf.getValue() === '') mf.setValue(initialValue);
    setTimeout(() => mf.focus(), 50);

    const handleInput = () => {
      const raw = mf.getValue('ascii-math');
      const san = sanitizeMath(raw);
      if (process.env.NODE_ENV === 'development') { const d = sanitizeMathDebug(raw); if (d) console.debug('[sanitize]', d); }
      callbacks.current.onChange(id, san);
    };

    const handleFocusIn  = () => { setFocus(true);  if (activeMathFieldRef) activeMathFieldRef.current = mf; };
    const handleFocusOut = () => {
      setFocus(false);
      if (!mf.getValue() && !isTransforming.current) callbacks.current.onDelete(id);
    };

    const handleKeyDown = (e) => {
      // " → text block, # → section block
      if (!mf.getValue()) {
        if (e.key === '"' || e.key === "'") { e.preventDefault(); isTransforming.current = true; callbacks.current.onTransform(id, 'text'); return; }
        if (e.key === '#') { e.preventDefault(); isTransforming.current = true; callbacks.current.onTransform(id, 'section'); return; }
      }
      if (e.key === 'Escape') { mf.blur(); return; }
      if (e.key === 'Enter')  { e.preventDefault(); mf.blur(); callbacks.current.onEnter(id); return; }
      if (e.key.startsWith('Arrow') && (e.ctrlKey || e.metaKey || !mf.getValue())) {
        e.preventDefault();
        const D = { ArrowUp:[0,-GRID_SIZE], ArrowDown:[0,GRID_SIZE], ArrowLeft:[-GRID_SIZE,0], ArrowRight:[GRID_SIZE,0] };
        const [dx,dy] = D[e.key] ?? [0,0];
        callbacks.current.onNudge(id, dx, dy);
      }
    };

    mf.addEventListener('input',    handleInput);
    mf.addEventListener('focusin',  handleFocusIn);
    mf.addEventListener('focusout', handleFocusOut);
    mf.addEventListener('keydown',  handleKeyDown);
    return () => {
      mf.removeEventListener('input',    handleInput);
      mf.removeEventListener('focusin',  handleFocusIn);
      mf.removeEventListener('focusout', handleFocusOut);
      mf.removeEventListener('keydown',  handleKeyDown);
    };
  }, [id, initialValue, setFocus, activeMathFieldRef]);

  const hasResult = numStr && numStr !== '';

  return (
    <>
      <math-field ref={mathFieldRef} style={{ minWidth: '30px' }} />

      {hasResult && !hasError && (
        <span className="math-result-wrapper">
          <span className="math-result-equals">=</span>
          <CopyableNum numStr={numStr} />
          {unitStr && (
            <UnitEditor
              id={id}
              unitStr={unitStr}
              hasUnitResult={hasUnitResult}
              unitIsOverridden={unitIsOverridden}
              onUnitChange={onUnitChange}
              onUnitReset={onUnitReset}
            />
          )}
        </span>
      )}

      {hasError && (
        <span
          className={`math-error-badge math-error-badge--${(errorLabel ?? 'error').replace(/[^a-z0-9]/g, '-')}`}
          onMouseEnter={() => setShowTip(true)}
          onMouseLeave={() => setShowTip(false)}
        >
          {errorLabel ?? 'error'}
          {showTip && errorMsg && <span className="math-error-tooltip">{errorMsg}</span>}
        </span>
      )}
    </>
  );
}
