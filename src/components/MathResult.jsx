import React, { useState, useRef, useEffect } from 'react';
import { useWorkspaceActionData } from '../WorkspaceContext';

export default function MathResult({ id, res, isStale }) {
  const { actions } = useWorkspaceActionData();
  const [isEditingUnit, setIsEditingUnit] = useState(false);
  const [tempUnit, setTempUnit] = useState('');
  const inputRef = useRef(null);

  // Auto-focus the input when entering edit mode
  useEffect(() => {
    if (isEditingUnit && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select(); // Highlight existing unit for quick overwrite
    }
  }, [isEditingUnit]);

  if (!res || (!res.numStr && !res.error)) return null;

  if (res.error) {
    return (
      <div
        className="math-result text-danger d-flex align-items-center user-select-none"
        style={{ marginLeft: '12px', fontSize: '0.9em', fontWeight: '500', cursor: 'help' }}
        title={res.errorMsg}
      >
        <span className="me-1" aria-hidden="true">⚠️</span>
        {res.errorLabel}
      </div>
    );
  }

  const handleUnitClick = () => {
    setTempUnit(res.unitStr || '');
    setIsEditingUnit(true);
  };

  const handleUnitSubmit = () => {
    // If empty, it removes the override and goes back to standard SI base
    const finalUnit = tempUnit.trim();

    if (finalUnit === res.unitStr) {
      setIsEditingUnit(false);
      return;
    }

    const result = actions.unitChange(id, finalUnit);

    if (result?.ok) {
      setIsEditingUnit(false);
    } else {
      // If conversion fails (incompatible or misspelled unit), revert UI to safe state
      setIsEditingUnit(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleUnitSubmit();
    }
    if (e.key === 'Escape') {
      setIsEditingUnit(false);
    }
  };

  return (
    <div
      className="math-result d-flex align-items-center"
      style={{
        marginLeft: '12px',
        fontSize: '1.1em',
        color: '#28a745',
        transition: 'opacity 0.2s ease, filter 0.2s ease',
        opacity: isStale ? 0.4 : 1,
        filter: isStale ? 'grayscale(80%)' : 'none'
      }}
    >
      {res.numStr && (
        <>
          <span className="me-1">= {res.numStr}</span>

          {isEditingUnit ? (
            <input
              ref={inputRef}
              value={tempUnit}
              onChange={(e) => setTempUnit(e.target.value)}
              onBlur={handleUnitSubmit}
              onKeyDown={handleKeyDown}
              className="form-control form-control-sm text-muted"
              style={{
                width: `${Math.max(60, tempUnit.length * 10 + 20)}px`, // Auto-scale width slightly
                padding: '0 4px',
                height: '24px',
                fontSize: '0.9em',
                background: '#f8f9fa',
                boxShadow: 'none',
                borderColor: '#ccc'
              }}
            />
          ) : (
            res.unitStr && (
              <span
                className="text-muted unit-badge"
                onClick={handleUnitClick}
                title="Click to change unit"
              >
                {res.unitStr}
              </span>
            )
          )}
        </>
      )}
    </div>
  );
}
