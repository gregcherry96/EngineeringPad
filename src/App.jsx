import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import * as math from 'mathjs';
import { MATH_SCOPE } from './constants';
import { useHistory, usePanZoom } from './hooks';
import { formatMathResult, classifyError, convertResult } from './utils';
import { WorkspaceContext } from './WorkspaceContext';
import Sidebar from './Sidebar';
import Toolbar from './components/Toolbar';
import BlockWrapper from './components/BlockWrapper';
import './App.css';

const GRID_SIZE = 20;
let nextId = 1;
const makeBlock = (x, y, type = 'math') => ({ id: nextId++, x, y, type, expression: '' });

export default function App() {
  const [results, setResults] = useState({});
  const [unitOverrides, setUnitOverrides] = useState({});
  const [userVars, setUserVars] = useState({});
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [cursorPos, setCursorPos] = useState(null);

  // UI Display Toggles
  const [showGrid, setShowGrid] = useState(true);
  const [paperMode, setPaperMode] = useState(false);
  const [pageCount, setPageCount] = useState(1);

  // Selection and Drag State
  const [selectedIds, setSelectedIds] = useState([]);
  const [marquee, setMarquee] = useState(null);
  const [activeDrag, setActiveDrag] = useState(null);

  const graphPaperRef = useRef(null);
  const canvasRef = useRef(null); // Ref to the actual scaled drawing surface
  const rawResultsRef = useRef({});
  const activeMathFieldRef = useRef(null);
  const spaceHeld = useRef(false);

  const getInitialBlocks = () => {
    try {
      const saved = JSON.parse(localStorage.getItem('mathpad-session'));
      if (saved?.savedBlocks) {
        nextId = Math.max(0, ...saved.savedBlocks.map(b => b.id)) + 1;
        return saved.savedBlocks;
      }
    } catch (e) {}
    return [];
  };

  const { state: blocks, setState: setBlocks, pushUndo, undo, redo, canUndo, canRedo, clearHistory } = useHistory(getInitialBlocks());
  const { zoom, setZoom, startPan, pan, stopPan, isPanning } = usePanZoom(graphPaperRef);

  const evaluateAllImmediate = useCallback((currentBlocks, currentOverrides) => {
    const sortedBlocks = [...currentBlocks].sort((a, b) => Math.abs(a.y - b.y) < GRID_SIZE ? a.x - b.x : a.y - b.y);
    const scope = { ...MATH_SCOPE };
    const newResults = {}, newRaw = {}, newVars = {};
    const baseKeys = new Set(Object.keys(MATH_SCOPE));

    for (const block of sortedBlocks) {
      if (block.type !== 'math' || !block.expression.trim()) continue;
      try {
        const result = math.evaluate(block.expression, scope);
        const formatted = formatMathResult(result);
        newResults[block.id] = formatted ? { ...formatted, error: false } : { numStr: '', unitStr: '', error: false };
        if (result?.isUnit) newRaw[block.id] = result;

        const ov = currentOverrides?.[block.id];
        if (ov && result?.isUnit) {
          try { newResults[block.id] = { ...convertResult(result, ov), error: false }; }
          catch { setUnitOverrides(p => { const n = { ...p }; delete n[block.id]; return n; }); }
        }

        for (const key of Object.keys(scope)) {
          if (!baseKeys.has(key) && typeof scope[key] !== 'function') {
            const fmt = formatMathResult(scope[key]);
            if (fmt) newVars[key] = fmt.unitStr ? `${fmt.numStr} ${fmt.unitStr}` : fmt.numStr;
          }
        }
      } catch (err) {
        const { label, msg } = classifyError(err);
        newResults[block.id] = { numStr: '', unitStr: '', error: true, errorLabel: label, errorMsg: msg };
      }
    }
    rawResultsRef.current = newRaw;
    setResults(newResults);
    setUserVars(newVars);
  }, []);

  useEffect(() => {
    evaluateAllImmediate(blocks, unitOverrides);
    localStorage.setItem('mathpad-session', JSON.stringify({ savedBlocks: blocks, savedOverrides: unitOverrides }));
  }, [blocks, unitOverrides, evaluateAllImmediate]);

  // Updated to calculate relative to the canvas rendering surface (fixes paper mode centering offsets)
  const canvasToWorld = (clientX, clientY) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    const wx = (clientX - rect.left) / zoom;
    const wy = (clientY - rect.top) / zoom;
    return { x: Math.round(wx / GRID_SIZE) * GRID_SIZE, y: Math.round(wy / GRID_SIZE) * GRID_SIZE };
  };

  // ─── Marquee Interactions ──────────────────────────────
  const handleMouseDown = (e) => {
    if (e.button === 1 || spaceHeld.current) { startPan(e); return; }
    if (e.target.closest('.block-container') || e.target.closest('.sidebar-panel') || e.target.closest('.navbar')) return;

    // Check if clicked outside of the paper bounds (in paper mode)
    if (paperMode && !e.target.closest('.canvas-area')) return;

    const { x, y } = canvasToWorld(e.clientX, e.clientY);
    setMarquee({ startX: x, startY: y, endX: x, endY: y });
    setSelectedIds([]);
    setCursorPos(null);
  };

  const handleMouseMove = (e) => {
    if (isPanning.current) { pan(e); return; }
    if (marquee) {
      const { x, y } = canvasToWorld(e.clientX, e.clientY);
      setMarquee(prev => ({ ...prev, endX: x, endY: y }));

      const minX = Math.min(marquee.startX, x);
      const maxX = Math.max(marquee.startX, x);
      const minY = Math.min(marquee.startY, y);
      const maxY = Math.max(marquee.startY, y);

      const newlySelected = blocks.filter(b =>
        b.x < maxX && b.x + 100 > minX && b.y < maxY && b.y + 40 > minY
      ).map(b => b.id);

      setSelectedIds(newlySelected);
    }
  };

  const handleMouseUp = (e) => {
    if (isPanning.current) stopPan();
    if (marquee) {
      const dx = Math.abs(marquee.startX - marquee.endX);
      const dy = Math.abs(marquee.startY - marquee.endY);

      if (dx < 5 && dy < 5) {
        const { x, y } = canvasToWorld(e.clientX, e.clientY);
        setCursorPos({ x, y });
        const hasEmpty = blocks.some(b => !b.expression.trim());
        if (hasEmpty) updateBlocks(p => p.filter(b => b.expression.trim()), true);
      }
      setMarquee(null);
    }
  };

  // ─── Block Actions ──────────────────────────────────────────
  const updateBlocks = (updater, pushHistory = false) => {
    if (pushHistory) pushUndo(blocks);
    setBlocks(prev => updater(prev));
  };

  const handleChange = (id, expression) => updateBlocks(p => p.map(b => b.id === id ? { ...b, expression } : b));
  const handleTransform = (id, type) => updateBlocks(p => p.map(b => b.id === id ? { ...b, type, expression: '' } : b));

  const handleDrag = (id, dx, dy) => {
    if (selectedIds.includes(id)) setActiveDrag({ id, dx, dy });
  };

  const handleDragStop = (id, dx, dy) => {
    setActiveDrag(null);
    if (dx !== 0 || dy !== 0) {
      const idsToMove = selectedIds.includes(id) ? selectedIds : [id];
      updateBlocks(p => p.map(b => idsToMove.includes(b.id) ? { ...b, x: b.x + dx, y: b.y + dy } : b), true);
    }
  };

  const handleNudge = (id, dx, dy) => {
    const idsToNudge = selectedIds.includes(id) ? selectedIds : [id];
    updateBlocks(p => p.map(b => idsToNudge.includes(b.id) ? { ...b, x: b.x + dx, y: b.y + dy } : b));
  };

  const handleDelete = (id) => {
    const idsToDelete = selectedIds.includes(id) ? selectedIds : [id];
    updateBlocks(p => p.filter(b => !idsToDelete.includes(b.id)), true);
    setSelectedIds([]);
    setUnitOverrides(p => { const n = { ...p }; idsToDelete.forEach(dId => delete n[dId]); return n; });
  };

  const handleClearWorkspace = () => {
    if (!window.confirm('Clear the entire workspace?')) return;
    pushUndo(blocks); setBlocks([]); setUnitOverrides({}); setSelectedIds([]); setCursorPos(null); clearHistory();
  };

  const handleUnitChange = (id, targetUnit) => {
    if (!targetUnit) { setUnitOverrides(p => { const n = { ...p }; delete n[id]; return n; }); return { ok: true }; }
    const raw = rawResultsRef.current[id];
    if (!raw) return { ok: false };
    try { convertResult(raw, targetUnit); setUnitOverrides(p => ({ ...p, [id]: targetUnit })); return { ok: true }; }
    catch { return { ok: false }; }
  };

  const handleEnter = (id) => {
    const cur = blocks.find(b => b.id === id);
    if (!cur) return;
    setCursorPos({ x: cur.x, y: cur.y + 60 });
    setSelectedIds([]);
  };

  const handleLeaveBlock = (id, key) => {
    const sorted = [...blocks].sort((a, b) => Math.abs(a.y - b.y) < GRID_SIZE ? a.x - b.x : a.y - b.y);
    const idx = sorted.findIndex(b => b.id === id);
    if (key === 'Tab' || key === 'ShiftTab') {
      const nextIdx = key === 'Tab' ? idx + 1 : idx - 1;
      if (sorted[nextIdx]) { setSelectedIds([sorted[nextIdx].id]); setCursorPos(null); }
      else { setCursorPos({ x: sorted[idx].x, y: sorted[idx].y + 60 }); setSelectedIds([]); }
      return;
    }
    setSelectedIds([]);
  };

  useEffect(() => {
    const handleKey = (e) => {
      if (e.target.closest('input, textarea, math-field')) return;

      if (e.key === 'Backspace' || e.key === 'Delete') {
        if (selectedIds.length > 0) { e.preventDefault(); handleDelete(selectedIds[0]); }
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); undo(); }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) { e.preventDefault(); redo(); }
      if (e.code === 'Space') { e.preventDefault(); spaceHeld.current = true; graphPaperRef.current?.classList.add('panning-mode'); }

      if (cursorPos && e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        const type = e.key === '"' || e.key === "'" ? 'text' : e.key === '#' ? 'section' : 'math';
        const newBlock = makeBlock(cursorPos.x, cursorPos.y, type);
        newBlock.expression = type === 'math' ? e.key : '';
        updateBlocks(p => [...p, newBlock], true);
        setSelectedIds([newBlock.id]); setCursorPos(null);
      }
    };

    const handleKeyUp = (e) => { if (e.code === 'Space') { spaceHeld.current = false; graphPaperRef.current?.classList.remove('panning-mode'); } };

    window.addEventListener('keydown', handleKey); window.addEventListener('keyup', handleKeyUp);
    return () => { window.removeEventListener('keydown', handleKey); window.removeEventListener('keyup', handleKeyUp); };
  }, [cursorPos, undo, redo, blocks, selectedIds]);

  const workspaceState = useMemo(() => ({
    blocks, results, rawResultsRef, unitOverrides, userVars, selectedIds, activeDrag, activeMathFieldRef,
    actions: {
      select: setSelectedIds, drag: handleDrag, dragStop: handleDragStop, delete: handleDelete,
      change: handleChange, enter: handleEnter, nudge: handleNudge,
      transform: handleTransform, unitChange: handleUnitChange, leaveBlock: handleLeaveBlock
    }
  }), [blocks, results, unitOverrides, userVars, selectedIds, activeDrag]);

  // Max dimensions for infinite canvas
  const maxW = Math.max(2000, ...blocks.map(b => b.x + 800), cursorPos ? cursorPos.x + 800 : 0);
  const maxH = Math.max(2000, ...blocks.map(b => b.y + 800), cursorPos ? cursorPos.y + 800 : 0);

  // Common inner canvas payload
  const canvasContent = (
    <>
      {cursorPos && selectedIds.length === 0 && <div className="canvas-crosshair" style={{ left: cursorPos.x, top: cursorPos.y }} />}
      {marquee && (
        <div style={{
          position: 'absolute', left: Math.min(marquee.startX, marquee.endX), top: Math.min(marquee.startY, marquee.endY),
          width: Math.abs(marquee.startX - marquee.endX), height: Math.abs(marquee.startY - marquee.endY),
          backgroundColor: 'rgba(13, 110, 253, 0.1)', border: '1px solid rgba(13, 110, 253, 0.5)', pointerEvents: 'none', zIndex: 100
        }} />
      )}
      {blocks.map(block => <BlockWrapper key={block.id} block={block} />)}
    </>
  );

  return (
    <WorkspaceContext.Provider value={workspaceState}>
      <div className="d-flex flex-column vh-100 vw-100 overflow-hidden">
        <Toolbar
          onUndo={undo} onRedo={redo} canUndo={canUndo} canRedo={canRedo} onClear={handleClearWorkspace}
          zoom={zoom} onZoomChange={(val) => val === 'reset' ? setZoom(1) : setZoom(z => Math.max(0.3, Math.min(3, z + val)))}
          showGrid={showGrid} onToggleGrid={() => setShowGrid(!showGrid)}
          paperMode={paperMode} onTogglePaper={() => setPaperMode(!paperMode)}
          onAddPage={() => setPageCount(p => p + 1)}
        />

        <div className="d-flex flex-grow-1 overflow-hidden">
          <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} userVars={userVars} onInsert={(str) => { if(activeMathFieldRef.current) activeMathFieldRef.current.executeCommand(['insert', str]); activeMathFieldRef.current?.focus();}} />

          {/* Wrapper Background */}
          <div ref={graphPaperRef} className={`graph-paper flex-grow-1 ${paperMode ? 'paper-mode-backdrop' : 'infinite-canvas-bg'} ${!paperMode && showGrid ? 'grid-bg' : ''}`} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>

            {paperMode ? (
              /* Paper Mode Layout */
                <div className="d-flex justify-content-center" style={{ minWidth: `${794 * zoom + 80}px`, minHeight: `${1123 * pageCount * zoom + 80}px`, padding: '40px' }}>
                {/* Multiply height by pageCount */}
                <div ref={canvasRef} className={`canvas-area a4-paper shadow ${showGrid ? 'grid-bg' : ''}`} style={{ transform: `scale(${zoom})`, width: '794px', height: `${1123 * pageCount}px`, flexShrink: 0 }}>
                  {canvasContent}
                </div>
              </div>
            ) : (
              /* Infinite Canvas Layout */
              <div ref={canvasRef} className="canvas-area" style={{ transform: `scale(${zoom})`, width: `${maxW * zoom}px`, height: `${maxH * zoom}px` }}>
                {canvasContent}
              </div>
            )}

          </div>
        </div>
      </div>
    </WorkspaceContext.Provider>
  );
}
