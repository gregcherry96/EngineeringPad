import { useState, useRef, useCallback, useEffect } from 'react';
import * as math from 'mathjs';
import { MATH_SCOPE } from './constants';
import Sidebar from './Sidebar';
import BlockWrapper from './BlockWrapper';
import './App.css';

const GRID_SIZE = 20;
const MIN_ZOOM  = 0.3;
const MAX_ZOOM  = 3.0;
const ZOOM_STEP = 0.12;
const UNDO_LIMIT = 60;

const snap = (val, zoom = 1) => Math.round(val / (GRID_SIZE * zoom)) * GRID_SIZE;

let nextId = 1;
const makeBlock = (x, y, type = 'math') => ({ id: nextId++, x, y, type, expression: '' });

// ─── Superscript helpers ──────────────────────────────────────────────────────
const SUP = {'-':'⁻','0':'⁰','1':'¹','2':'²','3':'³','4':'⁴','5':'⁵','6':'⁶','7':'⁷','8':'⁸','9':'⁹'};
const toSup = n => String(n).split('').map(c => SUP[c] ?? c).join('');

// ─── Number formatter ─────────────────────────────────────────────────────────
function formatNum(n) {
  if (n === null || n === undefined || !isFinite(n)) return String(n);
  const abs = Math.abs(n);
  if (abs !== 0 && (abs >= 1e7 || abs < 1e-4)) {
    const [coeff, exp] = n.toExponential(4).replace(/\.?0+e/, 'e').split('e');
    return `${coeff} × 10${toSup(exp.replace('+', ''))}`;
  }
  return String(parseFloat(n.toPrecision(7)));
}

// ─── Unit string builder ──────────────────────────────────────────────────────
function buildUnitStr(unitObj) {
  if (!unitObj?.units?.length) return '';
  const pos = [], neg = [];
  for (const t of unitObj.units) {
    const token = (t.prefix?.name ?? '') + (t.unit?.name ?? '');
    const p = t.power ?? 1;
    if (p === 0) continue;
    const sup = Math.abs(p) === 1 ? '' : toSup(Math.abs(p));
    (p > 0 ? pos : neg).push(token + sup);
  }
  if (!pos.length && !neg.length) return '';
  if (!neg.length) return pos.join(' ');
  if (!pos.length) return '/ ' + neg.join(' ');
  return pos.join(' ') + ' / ' + neg.join(' ');
}

// ─── Dimension → named SI unit ────────────────────────────────────────────────
const DIM_TO_UNIT = {
  '0,0,-1,0,0,0,0,0,0':   'Hz',
  '1,1,-2,0,0,0,0,0,0':   'N',
  '-1,1,-2,0,0,0,0,0,0':  'Pa',
  '2,1,-2,0,0,0,0,0,0':   'J',
  '2,1,-3,0,0,0,0,0,0':   'W',
  '0,0,1,1,0,0,0,0,0':    'C',
  '2,1,-3,-1,0,0,0,0,0':  'V',
  '-2,-1,4,2,0,0,0,0,0':  'F',
  '2,1,-3,-2,0,0,0,0,0':  'ohm',
  '-2,-1,3,2,0,0,0,0,0':  'S',
  '2,1,-2,-1,0,0,0,0,0':  'Wb',
  '0,1,-2,-1,0,0,0,0,0':  'T',
  '2,1,-2,-2,0,0,0,0,0':  'H',
  '2,0,-2,0,0,0,0,0,0':   'Gy',
  '0,0,-2,0,0,0,0,0,0':   'Bq',
};

function simplifyAndFormat(unitObj) {
  if (!unitObj?.isUnit) return null;
  const key   = (unitObj.dimensions ?? []).slice(0, 9).join(',');
  const named = DIM_TO_UNIT[key];
  if (named) {
    try {
      const val = unitObj.to(named).toNumber(named);
      return { numStr: formatNum(val), unitStr: named === 'ohm' ? 'Ω' : named };
    } catch { /* fall through */ }
  }
  // Compound fallback
  try {
    const parts = unitObj.units.filter(t => (t.power ?? 1) !== 0).map(t => {
      const tok = (t.prefix?.name ?? '') + (t.unit?.name ?? '');
      const p = t.power ?? 1;
      return p === 1 ? tok : `(${tok})^${p}`;
    });
    const val = unitObj.toNumber(parts.join(' '));
    return { numStr: formatNum(val), unitStr: buildUnitStr(unitObj) };
  } catch {
    return { numStr: formatNum(unitObj.value ?? 0), unitStr: buildUnitStr(unitObj) };
  }
}

export function convertResult(rawResult, targetUnit) {
  if (!rawResult?.isUnit) throw new Error('Not a unit quantity');
  const val = rawResult.to(targetUnit).toNumber(targetUnit);
  return { numStr: formatNum(val), unitStr: targetUnit === 'ohm' ? 'Ω' : targetUnit };
}

function formatMathResult(result) {
  if (result == null || typeof result === 'function') return null;
  if (result?.isUnit)    return simplifyAndFormat(result);
  if (result?.isMatrix)  return { numStr: result.toString(), unitStr: '' };
  if (Array.isArray(result)) return { numStr: JSON.stringify(result), unitStr: '' };
  if (typeof result === 'boolean') return { numStr: String(result), unitStr: '' };
  if (result?.isComplex) {
    const re = formatNum(result.re), im = formatNum(Math.abs(result.im));
    return { numStr: `${re} ${result.im >= 0 ? '+' : '−'} ${im}i`, unitStr: '' };
  }
  if (typeof result === 'number') return { numStr: formatNum(result), unitStr: '' };
  return { numStr: String(result), unitStr: '' };
}

function classifyError(err) {
  const msg = err?.message ?? String(err);
  if (/undefined symbol|is not defined/i.test(msg))     return { label: 'undefined', msg };
  if (/Units do not match|incompatible unit/i.test(msg)) return { label: 'unit mismatch', msg };
  if (/Unexpected token|parse error/i.test(msg))        return { label: 'syntax', msg };
  if (/Cannot convert|no unit/i.test(msg))              return { label: 'unit error', msg };
  if (/division by zero|Cannot divide/i.test(msg))      return { label: 'div / 0', msg };
  return { label: 'error', msg };
}

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [blocks, setBlocks]               = useState([]);
  const [results, setResults]             = useState({});
  const [unitOverrides, setUnitOverrides] = useState({});
  const [userVars, setUserVars]           = useState({});
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [selectedId, setSelectedId]       = useState(null);

  // ── Canvas transform ──────────────────────────────────────────────────────
  const [pan,  setPan]  = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);

  // ── Undo history ──────────────────────────────────────────────────────────
  const undoStack = useRef([]);
  const redoStack = useRef([]);

  const pushUndo = useCallback((snapshot) => {
    // Prevent pushing duplicate consecutive states
    if (undoStack.current.length > 0) {
      const lastState = undoStack.current[undoStack.current.length - 1];
      if (JSON.stringify(lastState) === JSON.stringify(snapshot)) return;
    }
    undoStack.current.push(snapshot);
    if (undoStack.current.length > UNDO_LIMIT) undoStack.current.shift();
    redoStack.current = [];
  }, []);

  // ── Refs ──────────────────────────────────────────────────────────────────
  const rawResultsRef    = useRef({});
  const activeMathFieldRef = useRef(null);
  const graphPaperRef      = useRef(null);
  const panOriginRef       = useRef(null); // { clientX, clientY, panX, panY }
  const isPanning          = useRef(false);
  const spaceHeld          = useRef(false);

  // ── Evaluate ──────────────────────────────────────────────────────────────
const evaluateAll = useCallback((updatedBlocks, currentOverrides) => {
    // 1. Sort blocks top-to-bottom based on their 'y' position
    const sortedBlocks = [...updatedBlocks].sort((a, b) => a.y - b.y);

    const scope      = { ...MATH_SCOPE };
    const newResults = {};
    const newRaw     = {};
    const newVars    = {};
    const baseKeys   = new Set(Object.keys(MATH_SCOPE));

    // 2. Iterate through the sorted blocks
    for (const block of sortedBlocks) {
      if (block.type !== 'math' || !block.expression.trim()) continue;
      try {
        const result    = math.evaluate(block.expression, scope);
        const formatted = formatMathResult(result);
        newResults[block.id] = formatted
          ? { ...formatted, error: false, errorLabel: null, errorMsg: null }
          : { numStr: '', unitStr: '', error: false, errorLabel: null, errorMsg: null };

        if (result?.isUnit) newRaw[block.id] = result;

        const ov = currentOverrides?.[block.id];
        if (ov && result?.isUnit) {
          try {
            newResults[block.id] = { ...convertResult(result, ov), error: false, errorLabel: null, errorMsg: null };
          } catch {
            setUnitOverrides(p => { const n = { ...p }; delete n[block.id]; return n; });
          }
        }

        for (const key of Object.keys(scope)) {
          if (baseKeys.has(key)) continue;
          try {
            const val = scope[key];
            if (typeof val === 'function') continue;
            const fmt = formatMathResult(val);
            if (fmt) newVars[key] = fmt.unitStr ? `${fmt.numStr} ${fmt.unitStr}` : fmt.numStr;
          } catch { /* skip */ }
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

  // ── Unit override ─────────────────────────────────────────────────────────
  const handleUnitChange = useCallback((id, targetUnit) => {
    const raw = rawResultsRef.current[id];
    if (!raw) return { ok: false, msg: 'No unit result' };
    try {
      const converted = convertResult(raw, targetUnit);
      setUnitOverrides(p => ({ ...p, [id]: targetUnit }));
      setResults(p => ({ ...p, [id]: { ...converted, error: false, errorLabel: null, errorMsg: null } }));
      return { ok: true };
    } catch (err) {
      return { ok: false, msg: err?.message ?? 'Incompatible unit' };
    }
  }, []);

  const handleUnitReset = useCallback((id) => {
    setUnitOverrides(p => { const n = { ...p }; delete n[id]; return n; });
    const raw = rawResultsRef.current[id];
    if (!raw) return;
    const fmt = formatMathResult(raw);
    if (fmt) setResults(p => ({ ...p, [id]: { ...fmt, error: false, errorLabel: null, errorMsg: null } }));
  }, []);

  // ── Block handlers ────────────────────────────────────────────────────────
  const canvasToWorld = useCallback((clientX, clientY) => {
    const rect = graphPaperRef.current.getBoundingClientRect();
    const wx = (clientX - rect.left - pan.x) / zoom;
    const wy = (clientY - rect.top  - pan.y) / zoom;
    return { x: Math.round(wx / GRID_SIZE) * GRID_SIZE, y: Math.round(wy / GRID_SIZE) * GRID_SIZE };
  }, [pan, zoom]);

  const handleCanvasClick = useCallback((e) => {
    if (isPanning.current) return;
    if (e.target.closest('.block-container') || e.target.closest('.sidebar')) return;
    setSelectedId(null);
    const { x, y } = canvasToWorld(e.clientX, e.clientY);
    const newBlock = makeBlock(x, y, 'math');
    setBlocks(prev => {
      const updated = [...prev, newBlock];
      pushUndo(prev);
      evaluateAll(updated, unitOverrides);
      return updated;
    });
  }, [canvasToWorld, evaluateAll, unitOverrides, pushUndo]);

  const handleChange = useCallback((id, expression) => {
    setBlocks(prev => {
      const updated = prev.map(b => b.id === id ? { ...b, expression } : b);
      evaluateAll(updated, unitOverrides);
      return updated;
    });
  }, [evaluateAll, unitOverrides]);

  const handleMove = useCallback((id, x, y) => {
    setBlocks(prev => {
      pushUndo(prev);
      return prev.map(b => b.id === id ? { ...b, x, y } : b);
    });
  }, [pushUndo]);

  const handleDelete = useCallback((id) => {
    setBlocks(prev => {
      pushUndo(prev);
      const updated = prev.filter(b => b.id !== id);
      evaluateAll(updated, unitOverrides);
      return updated;
    });
    setResults(p  => { const n = { ...p }; delete n[id]; return n; });
    setUnitOverrides(p => { const n = { ...p }; delete n[id]; return n; });
    delete rawResultsRef.current[id];
    if (selectedId === id) setSelectedId(null);
  }, [evaluateAll, unitOverrides, pushUndo, selectedId]);

  const handleEnter = useCallback((id) => {
    setBlocks(prev => {
      const cur = prev.find(b => b.id === id);
      if (!cur) return prev;
      const newBlock = makeBlock(cur.x, cur.y + 60, 'math');
      return [...prev, newBlock];
    });
  }, []);

  const handleNudge = useCallback((id, dx, dy) => {
    setBlocks(prev => prev.map(b => {
      if (b.id !== id) return b;
      // Allow fine-grained sub-grid nudging if not perfectly aligned
      const newX = b.x % GRID_SIZE === 0 ? b.x + dx : Math.round((b.x + dx) / GRID_SIZE) * GRID_SIZE;
      const newY = b.y % GRID_SIZE === 0 ? b.y + dy : Math.round((b.y + dy) / GRID_SIZE) * GRID_SIZE;
      return { ...b, x: newX, y: newY };
    }));
  }, []);

  const handleTransform = useCallback((id, newType) => {
    setBlocks(prev => prev.map(b => b.id === id ? { ...b, type: newType, expression: '' } : b));
  }, []);

  const handleInsert = useCallback((str) => {
    const mf = activeMathFieldRef.current;
    if (!mf) return;
    mf.executeCommand(['insert', str]);
    mf.focus();
  }, []);

  // ── Undo / Redo ───────────────────────────────────────────────────────────
  const handleUndo = useCallback(() => {
    if (!undoStack.current.length) return;
    const prev = undoStack.current.pop();
    redoStack.current.push(blocks);
    setBlocks(prev);
    evaluateAll(prev, unitOverrides);
  }, [blocks, evaluateAll, unitOverrides]);

  const handleRedo = useCallback(() => {
    if (!redoStack.current.length) return;
    const next = redoStack.current.pop();
    undoStack.current.push(blocks);
    setBlocks(next);
    evaluateAll(next, unitOverrides);
  }, [blocks, evaluateAll, unitOverrides]);

  // ── Zoom ──────────────────────────────────────────────────────────────────
  const handleWheel = useCallback((e) => {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    const rect  = graphPaperRef.current.getBoundingClientRect();
    const cx    = e.clientX - rect.left;
    const cy    = e.clientY - rect.top;
    const delta = e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP;
    setZoom(z => {
      const newZ = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z + delta));
      const scale = newZ / z;
      setPan(p => ({ x: cx - (cx - p.x) * scale, y: cy - (cy - p.y) * scale }));
      return newZ;
    });
  }, []);

  const zoomIn  = () => setZoom(z => Math.min(MAX_ZOOM, parseFloat((z + ZOOM_STEP).toFixed(2))));
  const zoomOut = () => setZoom(z => Math.max(MIN_ZOOM, parseFloat((z - ZOOM_STEP).toFixed(2))));
  const zoomReset = () => { setZoom(1); setPan({ x: 0, y: 0 }); };

  // ── Pan (space + drag or middle-click drag) ───────────────────────────────
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.code === 'Space' && !e.target.closest('input, textarea, math-field')) {
        e.preventDefault(); spaceHeld.current = true;
        graphPaperRef.current?.classList.add('panning-mode');
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); handleUndo(); }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) { e.preventDefault(); handleRedo(); }
    };
    const onKeyUp = (e) => {
      if (e.code === 'Space') {
        spaceHeld.current = false;
        graphPaperRef.current?.classList.remove('panning-mode');
      }
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup',   onKeyUp);
    return () => { window.removeEventListener('keydown', onKeyDown); window.removeEventListener('keyup', onKeyUp); };
  }, [handleUndo, handleRedo]);

  const handleMouseDown = useCallback((e) => {
    if (e.button === 1 || spaceHeld.current) {
      e.preventDefault();
      isPanning.current = true;
      panOriginRef.current = { clientX: e.clientX, clientY: e.clientY, panX: pan.x, panY: pan.y };
      graphPaperRef.current?.classList.add('panning-active');
    }
  }, [pan]);

  const handleMouseMove = useCallback((e) => {
    if (!isPanning.current || !panOriginRef.current) return;
    const dx = e.clientX - panOriginRef.current.clientX;
    const dy = e.clientY - panOriginRef.current.clientY;
    setPan({ x: panOriginRef.current.panX + dx, y: panOriginRef.current.panY + dy });
  }, []);

  const handleMouseUp = useCallback(() => {
    if (isPanning.current) {
      isPanning.current = false;
      graphPaperRef.current?.classList.remove('panning-active');
    }
  }, []);

  // Attach wheel listener (non-passive so we can preventDefault)
  useEffect(() => {
    const el = graphPaperRef.current;
    if (!el) return;
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  // ─── Render ────────────────────────────────────────────────────────────────
  const canUndo = undoStack.current.length > 0;
  const canRedo = redoStack.current.length > 0;

  return (
    <div className="app-shell">
      {/* ── Toolbar ── */}
      <div className="toolbar">
        <span className="toolbar-brand">MathPad</span>
        <span className="toolbar-divider" />
        <span className="toolbar-hint">Click to create</span>
        <span className="toolbar-divider" />
        <span className="toolbar-hint"><kbd>"</kbd> text block</span>
        <span className="toolbar-divider" />
        <span className="toolbar-hint"><kbd>#</kbd> heading</span>
        <span className="toolbar-divider" />
        <span className="toolbar-hint"><kbd>Space</kbd>+drag to pan</span>
        <span className="toolbar-divider" />
        <span className="toolbar-hint"><kbd>Ctrl</kbd>+scroll to zoom</span>

        <span style={{ flex: 1 }} />

        {/* Undo/Redo */}
        <button className={`toolbar-btn${canUndo ? '' : ' disabled'}`} onClick={handleUndo} title="Undo (Ctrl+Z)">↩</button>
        <button className={`toolbar-btn${canRedo ? '' : ' disabled'}`} onClick={handleRedo} title="Redo (Ctrl+Y)">↪</button>

        <span className="toolbar-divider" />

        {/* Zoom controls */}
        <button className="toolbar-btn" onClick={zoomOut} title="Zoom out">−</button>
        <span className="toolbar-zoom-label" onClick={zoomReset} title="Reset zoom">
          {Math.round(zoom * 100)}%
        </span>
        <button className="toolbar-btn" onClick={zoomIn}  title="Zoom in">+</button>

        <span className="toolbar-divider" />
        <span className="toolbar-block-count">
          {blocks.length > 0 ? `${blocks.length} block${blocks.length !== 1 ? 's' : ''}` : ''}
        </span>
      </div>

      <div className="below-toolbar">
        <Sidebar
          onInsert={handleInsert}
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(c => !c)}
          userVars={userVars}
        />

        <div
          ref={graphPaperRef}
          className="graph-paper"
          onClick={handleCanvasClick}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {/* Empty state hint */}
          {blocks.length === 0 && (
            <div className="canvas-empty-hint">
              <div className="canvas-empty-icon">f(x)</div>
              <div className="canvas-empty-title">Click anywhere to start</div>
              <div className="canvas-empty-sub">
                Type an expression like <code>m := 10 kg</code> then<br/>
                press <kbd>Enter</kbd> to create the next block
              </div>
            </div>
          )}

          {/* Zoom / pan transform layer */}
          <div
            className="canvas-area"
            style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: '0 0' }}
          >
            {blocks.map(block => {
              const res = results[block.id] ?? {};
              return (
                <BlockWrapper
                  key={block.id}
                  block={block}
                  numStr={res.numStr}
                  unitStr={res.unitStr}
                  hasError={!!res.error}
                  errorLabel={res.errorLabel}
                  errorMsg={res.errorMsg}
                  hasUnitResult={!!rawResultsRef.current[block.id]}
                  unitIsOverridden={!!unitOverrides[block.id]}
                  isSelected={selectedId === block.id}
                  activeMathFieldRef={activeMathFieldRef}
                  onSelect={setSelectedId}
                  onMove={handleMove}
                  onDelete={handleDelete}
                  onChange={handleChange}
                  onEnter={handleEnter}
                  onNudge={handleNudge}
                  onTransform={handleTransform}
                  onUnitChange={handleUnitChange}
                  onUnitReset={handleUnitReset}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Status bar ── */}
      <div className="status-bar">
        <span className="status-item">
          {zoom !== 1 && `${Math.round(zoom * 100)}%`}
        </span>
        <span style={{ flex: 1 }} />
        <span className="status-item">
          {Object.keys(userVars).length > 0 && `${Object.keys(userVars).length} variable${Object.keys(userVars).length !== 1 ? 's' : ''} defined`}
        </span>
        <span className="status-sep" />
        <span className="status-item">
          MathPad — click unit labels to convert
        </span>
      </div>
    </div>
  );
}
