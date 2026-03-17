import React, { useState, useRef } from 'react';

export default function Toolbar({ onUndo, onRedo, canUndo, canRedo, onClear, zoom, onZoomChange, showGrid, onToggleGrid, paperMode, onTogglePaper, onAddPage, onRemovePage, pageCount }) {
  const [confirmClear, setConfirmClear] = useState(false);
  const clearTimerRef = useRef(null);

  // Step 2: Clear Workspace Confirmation
  const handleClear = () => {
    if (confirmClear) {
      onClear();
      setConfirmClear(false);
      if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
    } else {
      setConfirmClear(true);
      clearTimerRef.current = setTimeout(() => setConfirmClear(false), 3000);
    }
  };

  return (
    <nav className="navbar navbar-expand bg-white border-bottom shadow-sm px-3 py-2 z-3 flex-shrink-0">
      <span className="navbar-brand fw-bold mb-0 me-auto" style={{fontFamily: 'Lora, serif'}}>MathPad</span>

      <div className="d-flex align-items-center gap-2">
        <div className="btn-group">
          <button className="btn btn-sm btn-outline-secondary border-0" onClick={onUndo} disabled={!canUndo} title="Undo (Ctrl+Z)"><i className="bi bi-arrow-counterclockwise"></i></button>
          <button className="btn btn-sm btn-outline-secondary border-0" onClick={onRedo} disabled={!canRedo} title="Redo (Ctrl+Y)"><i className="bi bi-arrow-clockwise"></i></button>
        </div>

        <button
          className={`btn btn-sm ${confirmClear ? 'btn-danger text-white px-2' : 'btn-outline-danger'} border-0 transition-colors duration-200`}
          onClick={handleClear}
          title="Clear Workspace"
        >
          {confirmClear ? <><i className="bi bi-exclamation-triangle me-1"></i>Clear?</> : <i className="bi bi-trash"></i>}
        </button>

        <div className="btn-group align-items-center ms-2 bg-light border rounded">
          <button className="btn btn-sm btn-light border-0" onClick={() => onZoomChange(-0.12)}><i className="bi bi-dash"></i></button>
          <span className="px-2 small fw-medium text-center" style={{cursor: 'pointer', minWidth: '50px'}} onClick={() => onZoomChange('reset')}>{Math.round(zoom * 100)}%</span>
          <button className="btn btn-sm btn-light border-0" onClick={() => onZoomChange(0.12)}><i className="bi bi-plus"></i></button>
        </div>

        <div className="d-flex align-items-center ms-1 border-start ps-2 gap-1">
          <button className={`btn btn-sm ${showGrid ? 'btn-secondary text-white' : 'btn-outline-secondary'} border-0`} onClick={onToggleGrid} title="Toggle Grid">
            <i className="bi bi-grid-3x3"></i>
          </button>
          <button className={`btn btn-sm ${paperMode ? 'btn-secondary text-white' : 'btn-outline-secondary'} border-0`} onClick={onTogglePaper} title="Toggle Paper Mode">
            <i className="bi bi-file-earmark"></i>
          </button>

          {/* Step 3: Add / Remove Page Stepper - Only visible in Paper Mode */}
          {paperMode && (
            <div className="btn-group align-items-center ms-1 bg-light border rounded">
              <button
                className="btn btn-sm btn-light border-0"
                onClick={onRemovePage}
                disabled={pageCount <= 1} /* Disable if only 1 page left */
                title="Remove Page"
              >
                <i className="bi bi-dash"></i>
              </button>
              <span className="px-2 small fw-medium text-center text-muted" style={{minWidth: '65px'}}>
                {pageCount} Page{pageCount !== 1 ? 's' : ''}
              </span>
              <button
                className="btn btn-sm btn-light border-0"
                onClick={onAddPage}
                title="Add Page"
              >
                <i className="bi bi-plus"></i>
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
