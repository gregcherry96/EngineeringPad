import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import * as math from 'mathjs';
import { MATH_SCOPE } from './constants';
import Sidebar from './Sidebar';
import BlockWrapper from './components/BlockWrapper';
import './App.css';

const GRID_SIZE = 20;
const MIN_ZOOM  = 0.3;
const MAX_ZOOM  = 3.0;
const ZOOM_STEP = 0.12;
const UNDO_LIMIT = 60;

// ─── Utility helpers ──────────────────────────────────────────────────────────
const snap = (val, zoom = 1) => Math.round(val / (GRID_SIZE * zoom)) * GRID_SIZE;
let nextId = 1;
const makeBlock = (x, y, type = 'math') => ({ id: nextId++, x, y, type, expression: '' });

// Helper to find if a block assigns a variable (e.g. "m =" or "m :=")
const getAssignedVar = (expr) => {
  if (!expr) return null;
  const match = expr.match(/^\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*(:=|=)/);
  return match ? match[1] : null;
};

const SUP = {'-':'⁻','0':'⁰','1':'¹','2':'²','3':'³','4':'⁴','5':'⁵','6':'⁶','7':'⁷','8':'⁸','9':'⁹'};
const toSup = n => String(n).split('').map(c => SUP[c] ?? c).join('');

function debounce(func, wait) {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

export function convertResult(rawResult, targetUnit) {
  if (!rawResult?.isUnit) throw new Error('Not a unit quantity');
  const val = rawResult.to(targetUnit).toNumber(targetUnit);
  return { numStr: formatNum(val), unitStr: targetUnit === 'ohm' ? 'Ω' : targetUnit };
}

function formatNum(n) {
  if (n === null || n === undefined || !isFinite(n)) return String(n);
  const abs = Math.abs(n);
  if (abs !== 0 && (abs >= 1e7 || abs < 1e-4)) {
    const [coeff, exp] = n.toExponential(4).replace(/\.?0+e/, 'e').split('e');
    return `${coeff} × 10${toSup(exp.replace('+', ''))}`;
  }
  return String(parseFloat(n.toPrecision(7)));
}

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

export default function App() {
  const [blocks, setBlocks]               = useState([]);
  const [results, setResults]             = useState({});
  const [unitOverrides, setUnitOverrides] = useState({});
  const [userVars, setUserVars]           = useState({});
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [selectedId, setSelectedId]       = useState(null);
  const [cursorPos, setCursorPos]         = useState(null); 
  const [zoom, setZoom] = useState(1);
  const [isLoaded, setIsLoaded]           = useState(false);

  const undoStack = useRef([]);
  const redoStack = useRef([]);

  const pushUndo = useCallback((snapshot) => {
    if (undoStack.current.length > 0) {
      const lastState = undoStack.current[undoStack.current.length - 1];
      if (JSON.stringify(lastState) === JSON.stringify(snapshot)) return;
    }
    undoStack.current.push(snapshot);
    if (undoStack.current.length > UNDO_LIMIT) undoStack.current.shift();
    redoStack.current = [];
  }, []);

  const rawResultsRef      = useRef({});
  const activeMathFieldRef = useRef(null);
  const graphPaperRef      = useRef(null);
  const panOriginRef       = useRef(null); 
  const isPanning          = useRef(false);
  const spaceHeld          = useRef(false);

  // ── Auto-Load/Save LocalStorage ───────────────────────────────────────────
  useEffect(() => {
    try {
      const savedData = localStorage.getItem('mathpad-session');
      if (savedData) {
        const { savedBlocks, savedOverrides } = JSON.parse(savedData);
        if (savedBlocks && Array.isArray(savedBlocks)) {
          setBlocks(savedBlocks);
          setUnitOverrides(savedOverrides || {});
          
          const maxId = Math.max(0, ...savedBlocks.map(b => b.id));
          nextId = maxId + 1;

          evaluateAllImmediate(savedBlocks, savedOverrides || {});
        }
      }
    } catch (e) {
      console.warn("Could not load saved session", e);
    }
    setIsLoaded(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    localStorage.setItem('mathpad-session', JSON.stringify({ 
      savedBlocks: blocks, 
      savedOverrides: unitOverrides 
    }));
  }, [blocks, unitOverrides, isLoaded]);

  // ── Evaluate ──────────────────────────────────────────────────────────────
  const evaluateAllImmediate = useCallback((updatedBlocks, currentOverrides) => {
    const sortedBlocks = [...updatedBlocks].sort((a, b) => {
      if (Math.abs(a.y - b.y) < GRID_SIZE) return a.x - b.x;
      return a.y - b.y;
    });

    const scope      = { ...MATH_SCOPE };
    const newResults = {};
    const newRaw     = {};
    const newVars    = {};
    const baseKeys   = new Set(Object.keys(MATH_SCOPE));

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

  const evaluateAllDebounced = useMemo(
    () => debounce(evaluateAllImmediate, 150),
    [evaluateAllImmediate]
  );

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
    const scrollX = graphPaperRef.current.scrollLeft;
    const scrollY = graphPaperRef.current.scrollTop;

    const wx = (clientX - rect.left + scrollX) / zoom;
    const wy = (clientY - rect.top + scrollY) / zoom;
    return { x: Math.round(wx / GRID_SIZE) * GRID_SIZE, y: Math.round(wy / GRID_SIZE) * GRID_SIZE };
  }, [zoom]);

  const handleCanvasClick = useCallback((e) => {
    if (isPanning.current) return;
    if (e.target.closest('.block-container') || e.target.closest('.sidebar') || e.target.closest('.toolbar')) return;
    
    if (selectedId) {
      const activeBlock = blocks.find(b => b.id === selectedId);
      if (activeBlock && !activeBlock.expression.trim()) {
        handleDelete(selectedId);
      }
    }

    setSelectedId(null);
    const { x, y } = canvasToWorld(e.clientX, e.clientY);
    setCursorPos({ x, y }); 
  }, [canvasToWorld, blocks, selectedId]);

  const handleChange = useCallback((id, expression) => {
    setBlocks(prev => {
      const updated = prev.map(b => b.id === id ? { ...b, expression } : b);
      evaluateAllDebounced(updated, unitOverrides);
      return updated;
    });
  }, [evaluateAllDebounced, unitOverrides]);

  const handleMove = useCallback((id, x, y) => {
    setBlocks(prev => {
      pushUndo(prev);
      const updated = prev.map(b => b.id === id ? { ...b, x, y } : b);
      evaluateAllImmediate(updated, unitOverrides);
      return updated;
    });
  }, [pushUndo, evaluateAllImmediate, unitOverrides]);

  const handleDelete = useCallback((id) => {
    setBlocks(prev => {
      pushUndo(prev);
      const updated = prev.filter(b => b.id !== id);
      evaluateAllImmediate(updated, unitOverrides);
      return updated;
    });
    setResults(p  => { const n = { ...p }; delete n[id]; return n; });
    setUnitOverrides(p => { const n = { ...p }; delete n[id]; return n; });
    delete rawResultsRef.current[id];
    
    if (selectedId === id) setSelectedId(null);
  }, [evaluateAllImmediate, unitOverrides, pushUndo, selectedId]);

  const handleEnter = useCallback((id, isShift = false) => {
    const cur = blocks.find(b => b.id === id);
    if (!cur) return;

    // "Push Down" logic: If Shift+Enter, push everything below this block down by 4 grid spaces
    if (isShift) {
      setBlocks(prev => {
        pushUndo(prev);
        const updated = prev.map(b => {
          if (b.y > cur.y || (b.y === cur.y && b.id !== id)) {
            return { ...b, y: b.y + (GRID_SIZE * 4) };
          }
          return b;
        });
        evaluateAllDebounced(updated, unitOverrides);
        return updated;
      });
    }

    setCursorPos({ x: cur.x, y: cur.y + (isShift ? GRID_SIZE * 4 : 60) });
    setSelectedId(null); 
  }, [blocks, pushUndo, evaluateAllDebounced, unitOverrides]);

  const handleNudge = useCallback((id, dx, dy) => {
    setBlocks(prev => {
      const updated = prev.map(b => {
        if (b.id !== id) return b;
        const newX = b.x % GRID_SIZE === 0 ? b.x + dx : Math.round((b.x + dx) / GRID_SIZE) * GRID_SIZE;
        const newY = b.y % GRID_SIZE === 0 ? b.y + dy : Math.round((b.y + dy) / GRID_SIZE) * GRID_SIZE;
        return { ...b, x: newX, y: newY };
      });
      evaluateAllImmediate(updated, unitOverrides);
      return updated;
    });
  }, [evaluateAllImmediate, unitOverrides]);

  const handleTransform = useCallback((id, newType) => {
    setBlocks(prev => prev.map(b => b.id === id ? { ...b, type: newType, expression: '' } : b));
  }, []);

  const handleInsert = useCallback((str) => {
    const mf = activeMathFieldRef.current;
    if (!mf) return;
    mf.executeCommand(['insert', str]);
    mf.focus();
  }, []);

  const handleLeaveBlock = useCallback((id, triggerKey) => {
    const sortedBlocks = [...blocks].sort((a, b) => Math.abs(a.y - b.y) < GRID_SIZE ? a.x - b.x : a.y - b.y);
    const curIdx = sortedBlocks.findIndex(b => b.id === id);
    const cur = sortedBlocks[curIdx];
    if (!cur) return;
  
    // Tab Navigation
    if (triggerKey === 'Tab' || triggerKey === 'ShiftTab') {
      const nextIdx = triggerKey === 'Tab' ? curIdx + 1 : curIdx - 1;
      if (nextIdx >= 0 && nextIdx < sortedBlocks.length) {
        setSelectedId(sortedBlocks[nextIdx].id);
        setCursorPos(null);
      } else {
        // If end of document, drop cursor at bottom
        setCursorPos({ x: cur.x, y: cur.y + 60 });
        setSelectedId(null);
      }
      return;
    }

    let nx = cur.x;
    let ny = cur.y;
    const step = GRID_SIZE;
  
    if (triggerKey === 'ArrowUp') ny -= step;
    else if (triggerKey === 'ArrowDown') ny += step * 3; 
    else if (triggerKey === 'ArrowLeft') nx -= step;
    else if (triggerKey === 'ArrowRight') {
      const el = document.getElementById(`block-container-${id}`);
      if (el) {
        nx += Math.ceil((el.getBoundingClientRect().width / zoom) / GRID_SIZE) * GRID_SIZE + step;
      } else {
        nx += step * 5; 
      }
    }
  
    setCursorPos({ x: nx, y: ny });
    setSelectedId(null);
  }, [blocks, zoom]);

  // Drag and Drop variables onto canvas
  const handleDrop = useCallback((e) => {
    e.preventDefault();
    const varName = e.dataTransfer.getData('application/mathpad-var');
    if (varName) {
      const { x, y } = canvasToWorld(e.clientX, e.clientY);
      const newBlock = makeBlock(x, y, 'math');
      newBlock.expression = varName;
      
      setBlocks(prev => {
        const updated = [...prev, newBlock];
        pushUndo(prev);
        return updated;
      });
      setSelectedId(newBlock.id);
    }
  }, [canvasToWorld, pushUndo]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault(); 
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  // ── Global Keyboard Shortcuts & Dynamic Collision Detection ───────────────
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if (e.target.closest('input, textarea, math-field')) return;

      // Block Duplication (Ctrl+D)
      if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        if (selectedId) {
          e.preventDefault();
          const sourceBlock = blocks.find(b => b.id === selectedId);
          if (sourceBlock) {
             const newBlock = makeBlock(sourceBlock.x + GRID_SIZE, sourceBlock.y + GRID_SIZE*2, sourceBlock.type);
             newBlock.expression = sourceBlock.expression;
             
             setBlocks(prev => {
               const updated = [...prev, newBlock];
               pushUndo(prev);
               return updated;
             });
             
             setSelectedId(newBlock.id);
             setCursorPos(null);
          }
        }
        return;
      }

      if (e.key === '/') {
        e.preventDefault();
        setSidebarCollapsed(false);
        setTimeout(() => document.querySelector('.sidebar-search')?.focus(), 50);
        return;
      }

      if (cursorPos) {
        if (e.key.startsWith('Arrow')) {
          e.preventDefault();
          const step = GRID_SIZE;
          let nx = cursorPos.x;
          let ny = cursorPos.y;

          if (e.key === 'ArrowUp') ny = Math.max(0, ny - step);
          if (e.key === 'ArrowDown') ny += step;
          if (e.key === 'ArrowLeft') nx = Math.max(0, nx - step);
          if (e.key === 'ArrowRight') nx += step;

          const graphRect = graphPaperRef.current?.getBoundingClientRect();
          const scrollX = graphPaperRef.current?.scrollLeft || 0;
          const scrollY = graphPaperRef.current?.scrollTop || 0;

          if (graphRect) {
            const hitBlock = blocks.find(b => {
              const el = document.getElementById(`block-container-${b.id}`);
              if (!el) return false;
              const rect = el.getBoundingClientRect();
              
              const elWorldX = (rect.left - graphRect.left + scrollX) / zoom;
              const elWorldY = (rect.top - graphRect.top + scrollY) / zoom;
              const elWorldW = rect.width / zoom;
              const elWorldH = rect.height / zoom;

              return nx >= elWorldX - 10 && nx <= elWorldX + elWorldW + 10 &&
                     ny >= elWorldY - 10 && ny <= elWorldY + elWorldH + 10;
            });

            if (hitBlock) {
              setSelectedId(hitBlock.id);
              setCursorPos(null); 
            } else {
              setCursorPos({ x: nx, y: ny });
            }
          }
          return;
        }

        if (e.key === 'Escape') {
          setCursorPos(null);
          return;
        }

        if (e.key.length === 1 || e.key === 'Enter') {
          e.preventDefault();
          
          let type = 'math';
          let initialExpr = e.key.length === 1 ? e.key : '';

          if (e.key === '"' || e.key === "'") { type = 'text'; initialExpr = ''; }
          else if (e.key === '#') { type = 'section'; initialExpr = ''; }

          const newBlock = makeBlock(cursorPos.x, cursorPos.y, type);
          newBlock.expression = initialExpr;

          setBlocks(prev => {
            const updated = [...prev, newBlock];
            pushUndo(prev);
            return updated;
          });
          
          setSelectedId(newBlock.id);
          setCursorPos(null);
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [cursorPos, pushUndo, blocks, zoom, selectedId]);

  // ── Undo / Redo ───────────────────────────────────────────────────────────
  const handleUndo = useCallback(() => {
    if (!undoStack.current.length) return;
    const prev = undoStack.current.pop();
    redoStack.current.push(blocks);
    setBlocks(prev);
    evaluateAllImmediate(prev, unitOverrides);
  }, [blocks, evaluateAllImmediate, unitOverrides]);

  const handleRedo = useCallback(() => {
    if (!redoStack.current.length) return;
    const next = redoStack.current.pop();
    undoStack.current.push(blocks);
    setBlocks(next);
    evaluateAllImmediate(next, unitOverrides);
  }, [blocks, evaluateAllImmediate, unitOverrides]);

  // ── Zoom (Native scrolling) ───────────────────────────────────────────────
  const handleWheel = useCallback((e) => {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    const rect = graphPaperRef.current.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;

    const delta = e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP;
    setZoom(z => {
      const newZ = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z + delta));
      const scale = newZ / z;

      if (graphPaperRef.current) {
        const scrollX = graphPaperRef.current.scrollLeft;
        const scrollY = graphPaperRef.current.scrollTop;
        requestAnimationFrame(() => {
          graphPaperRef.current.scrollLeft = scrollX + (cx + scrollX) * (scale - 1);
          graphPaperRef.current.scrollTop = scrollY + (cy + scrollY) * (scale - 1);
        });
      }
      return newZ;
    });
  }, []);

  const zoomIn  = () => setZoom(z => Math.min(MAX_ZOOM, parseFloat((z + ZOOM_STEP).toFixed(2))));
  const zoomOut = () => setZoom(z => Math.max(MIN_ZOOM, parseFloat((z - ZOOM_STEP).toFixed(2))));
  const zoomReset = () => { setZoom(1); };

  // ── Native Pan (Dragging the scrollbar) ───────────────────────────────────
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
      panOriginRef.current = {
        clientX: e.clientX,
        clientY: e.clientY,
        scrollLeft: graphPaperRef.current.scrollLeft,
        scrollTop: graphPaperRef.current.scrollTop
      };
      graphPaperRef.current?.classList.add('panning-active');
    }
  }, []);

  const handleMouseMove = useCallback((e) => {
    if (!isPanning.current || !panOriginRef.current) return;
    const dx = e.clientX - panOriginRef.current.clientX;
    const dy = e.clientY - panOriginRef.current.clientY;

    if (graphPaperRef.current) {
      graphPaperRef.current.scrollLeft = panOriginRef.current.scrollLeft - dx;
      graphPaperRef.current.scrollTop = panOriginRef.current.scrollTop - dy;
    }
  }, []);

  const handleMouseUp = useCallback(() => {
    if (isPanning.current) {
      isPanning.current = false;
      graphPaperRef.current?.classList.remove('panning-active');
    }
  }, []);

  useEffect(() => {
    const el = graphPaperRef.current;
    if (!el) return;
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  const maxCanvasWidth = Math.max(2000, ...blocks.map(b => b.x + 800), cursorPos ? cursorPos.x + 800 : 0);
  const maxCanvasHeight = Math.max(2000, ...blocks.map(b => b.y + 800), cursorPos ? cursorPos.y + 800 : 0);

  const canUndo = undoStack.current.length > 0;
  const canRedo = redoStack.current.length > 0;

  return (
    <div className="app-shell">
      {/* ── Toolbar ── */}
      <div className="toolbar">
        <span className="toolbar-brand">MathPad</span>
        <span className="toolbar-divider" />
        <span className="toolbar-hint">Click to place cursor</span>
        <span className="toolbar-divider" />
        <span className="toolbar-hint"><kbd>Shift+Enter</kbd> push down</span>
        <span className="toolbar-divider" />
        <span className="toolbar-hint"><kbd>Tab</kbd> next block</span>
        <span className="toolbar-divider" />
        <span className="toolbar-hint"><kbd>Ctrl+D</kbd> duplicate</span>

        <span style={{ flex: 1 }} />

        <button className={`toolbar-btn${canUndo ? '' : ' disabled'}`} onClick={handleUndo} title="Undo (Ctrl+Z)">↩</button>
        <button className={`toolbar-btn${canRedo ? '' : ' disabled'}`} onClick={handleRedo} title="Redo (Ctrl+Y)">↪</button>
        
        <button 
          className="toolbar-btn" 
          onClick={() => {
            if (window.confirm('Clear the entire workspace?')) {
              pushUndo(blocks);
              setBlocks([]);
              setResults({});
              setUnitOverrides({});
              setUserVars({});
              setSelectedId(null);
              setCursorPos(null);
              localStorage.removeItem('mathpad-session');
            }
          }} 
          title="Clear Workspace"
        >
          🗑️
        </button>

        <span className="toolbar-divider" />

        <button className="toolbar-btn" onClick={zoomOut} title="Zoom out">−</button>
        <span className="toolbar-zoom-label" onClick={zoomReset} title="Reset zoom">
          {Math.round(zoom * 100)}%
        </span>
        <button className="toolbar-btn" onClick={zoomIn}  title="Zoom in">+</button>
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
          onDrop={handleDrop}
          onDragOver={handleDragOver}
        >
          {blocks.length === 0 && !cursorPos && (
            <div className="canvas-empty-state" style={{position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center', color: '#6a6560', pointerEvents: 'none'}}>
              <h1 style={{fontFamily: 'Lora', color: '#1a1714', margin: '0 0 10px 0'}}>MathPad</h1>
              <p style={{margin: '0 0 20px 0'}}>Click anywhere to place the cursor and start typing</p>
              <div style={{display: 'flex', gap: '20px', justifyContent: 'center', fontSize: '13px'}}>
                <span><code style={{background: '#e8e4db', padding: '4px 8px', borderRadius: '4px', fontFamily: '"JetBrains Mono", monospace'}}>m := 10 kg</code> Define variables</span>
                <span><code style={{background: '#e8e4db', padding: '4px 8px', borderRadius: '4px', fontFamily: '"JetBrains Mono", monospace'}}>F = m * g</code> Calculate results</span>
              </div>
            </div>
          )}

          <div
            className="canvas-area"
            style={{
              transform: `scale(${zoom})`,
              transformOrigin: '0 0',
              minWidth: `${maxCanvasWidth * zoom}px`,
              minHeight: `${maxCanvasHeight * zoom}px`
            }}
          >
            {cursorPos && !selectedId && (
              <div 
                className="canvas-crosshair" 
                style={{ left: cursorPos.x, top: cursorPos.y }}
              />
            )}

            {(() => {
              const activeBlock = blocks.find(b => b.id === selectedId);
              const activeDeps = activeBlock && activeBlock.type === 'math' 
                ? Object.keys(userVars).filter(v => activeBlock.expression.includes(v)) 
                : [];

              return blocks.map(block => {
                const res = results[block.id] ?? {};
                const definedVar = getAssignedVar(block.expression);
                const isDependency = activeDeps.includes(definedVar);

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
                    isDependency={isDependency}
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
                    onLeaveBlock={handleLeaveBlock}
                  />
                );
              });
            })()}
          </div>
        </div>
      </div>

      <div className="status-bar">
        <span className="status-item">
          {zoom !== 1 && `${Math.round(zoom * 100)}%`}
        </span>
        <span style={{ flex: 1 }} />
        <span className="status-item">
          {Object.keys(userVars).length > 0 && `${Object.keys(userVars).length} variable${Object.keys(userVars).length !== 1 ? 's' : ''} defined`}
        </span>
      </div>
    </div>
  );
}