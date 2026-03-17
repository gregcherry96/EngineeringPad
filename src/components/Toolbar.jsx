import React, { useState, useRef } from 'react';
import { getCantileverExample } from '../utils/examples';

export default function Toolbar({ onUndo, onRedo, canUndo, canRedo, onClear, onLoadWorkspace, zoom, onZoomChange, showGrid, onToggleGrid, paperMode, onTogglePaper, onAddPage, onRemovePage, pageCount }) {
  const [confirmClear, setConfirmClear] = useState(false);
  const [fileMenuOpen, setFileMenuOpen] = useState(false);
  const clearTimerRef = useRef(null);
  const fileInputRef = useRef(null);

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

  // Step 3: Handle File Export
  const handleExport = () => {
    const data = localStorage.getItem('mathpad-session') || JSON.stringify({ savedBlocks: [], savedOverrides: {} });
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mathpad-workspace.json';
    a.click();
    setFileMenuOpen(false);
  };

  // Step 3: Handle File Import
  const handleImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const parsed = JSON.parse(evt.target.result);
        if (parsed.savedBlocks) onLoadWorkspace(parsed.savedBlocks, parsed.savedOverrides || {});
      } catch (err) {
        alert('Invalid Workspace JSON file.');
      }
    };
    reader.readAsText(file);
    setFileMenuOpen(false);
    e.target.value = null; // Reset input
  };

  return (
    <nav className="navbar navbar-expand bg-white border-bottom shadow-sm px-3 py-2 z-3 flex-shrink-0">
      <span className="navbar-brand fw-bold mb-0 me-auto" style={{fontFamily: 'Lora, serif'}}>MathPad</span>

      <div className="d-flex align-items-center gap-2">
        {/* File Menu Dropdown */}
        <div className="dropdown me-2 position-relative" onMouseLeave={() => setFileMenuOpen(false)}>
          <button
            className="btn btn-sm btn-outline-secondary"
            onClick={() => setFileMenuOpen(!fileMenuOpen)}
          >
            <i className="bi bi-folder2-open me-1"></i> File
          </button>

          {fileMenuOpen && (
            <ul className="dropdown-menu shadow-sm show" style={{ position: 'absolute', top: '100%', left: 0, fontSize: '0.875rem' }}>
              <li>
                <button className="dropdown-item py-2" onClick={() => fileInputRef.current?.click()}>
                  <i className="bi bi-file-earmark-arrow-up me-2 text-muted"></i>Open Workspace...
                </button>
              </li>
              <li>
                <button className="dropdown-item py-2" onClick={handleExport}>
                  <i className="bi bi-file-earmark-arrow-down me-2 text-muted"></i>Save Workspace...
                </button>
              </li>
              <li><hr className="dropdown-divider" /></li>
              <li><h6 className="dropdown-header">Examples</h6></li>
              <li>
                <button
                  className="dropdown-item py-2"
                  onClick={() => {
                    const example = getCantileverExample();
                    onLoadWorkspace(example.savedBlocks, example.savedOverrides);
                    setFileMenuOpen(false);
                  }}
                >
                  <i className="bi bi-rocket me-2 text-primary"></i>Structural Cantilever (RSA)
                </button>
              </li>
            </ul>
          )}
        </div>

        {/* Hidden File Input for loading */}
        <input type="file" accept=".json" ref={fileInputRef} style={{ display: 'none' }} onChange={handleImport} />

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

          {paperMode && (
            <div className="btn-group align-items-center ms-1 bg-light border rounded">
              <button className="btn btn-sm btn-light border-0" onClick={onRemovePage} disabled={pageCount <= 1} title="Remove Page"><i className="bi bi-dash"></i></button>
              <span className="px-2 small fw-medium text-center text-muted" style={{minWidth: '65px'}}>{pageCount} Page{pageCount !== 1 ? 's' : ''}</span>
              <button className="btn btn-sm btn-light border-0" onClick={onAddPage} title="Add Page"><i className="bi bi-plus"></i></button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
