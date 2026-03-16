import { useState, useRef, useCallback, useEffect } from 'react';

// ─── Undo/Redo History Hook ──────────────────────────────────────────
export function useHistory(initialState = [], limit = 60) {
  const [state, setState] = useState(initialState);
  const undoStack = useRef([]);
  const redoStack = useRef([]);

  const pushUndo = useCallback((snapshot) => {
    if (undoStack.current.length > 0 && JSON.stringify(undoStack.current.at(-1)) === JSON.stringify(snapshot)) return;
    undoStack.current.push(snapshot);
    if (undoStack.current.length > limit) undoStack.current.shift();
    redoStack.current = [];
  }, [limit]);

  const undo = useCallback((onRestore) => {
    if (!undoStack.current.length) return;
    const prev = undoStack.current.pop();
    redoStack.current.push(state);
    setState(prev);
    if (onRestore) onRestore(prev);
  }, [state]);

  const redo = useCallback((onRestore) => {
    if (!redoStack.current.length) return;
    const next = redoStack.current.pop();
    undoStack.current.push(state);
    setState(next);
    if (onRestore) onRestore(next);
  }, [state]);

  const clearHistory = useCallback(() => {
    undoStack.current = [];
    redoStack.current = [];
  }, []);

  return { state, setState, pushUndo, undo, redo, canUndo: undoStack.current.length > 0, canRedo: redoStack.current.length > 0, clearHistory };
}

// ─── Canvas Pan & Zoom Hook ──────────────────────────────────────────
export function usePanZoom(graphPaperRef, minZoom = 0.3, maxZoom = 3.0, zoomStep = 0.12) {
  const [zoom, setZoom] = useState(1);
  const isPanning = useRef(false);
  const panOrigin = useRef(null);

  const handleWheel = useCallback((e) => {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    const rect = graphPaperRef.current.getBoundingClientRect();
    const cx = e.clientX - rect.left, cy = e.clientY - rect.top;

    setZoom(z => {
      const newZ = Math.max(minZoom, Math.min(maxZoom, z + (e.deltaY < 0 ? zoomStep : -zoomStep)));
      const scale = newZ / z;
      if (graphPaperRef.current) {
        const { scrollLeft: sX, scrollTop: sY } = graphPaperRef.current;
        requestAnimationFrame(() => {
          graphPaperRef.current.scrollLeft = sX + (cx + sX) * (scale - 1);
          graphPaperRef.current.scrollTop = sY + (cy + sY) * (scale - 1);
        });
      }
      return newZ;
    });
  }, [graphPaperRef, maxZoom, minZoom, zoomStep]);

  const startPan = useCallback((e) => {
    isPanning.current = true;
    panOrigin.current = { cx: e.clientX, cy: e.clientY, sX: graphPaperRef.current.scrollLeft, sY: graphPaperRef.current.scrollTop };
    graphPaperRef.current?.classList.add('panning-active');
  }, [graphPaperRef]);

  const pan = useCallback((e) => {
    if (isPanning.current && panOrigin.current && graphPaperRef.current) {
      graphPaperRef.current.scrollLeft = panOrigin.current.sX - (e.clientX - panOrigin.current.cx);
      graphPaperRef.current.scrollTop = panOrigin.current.sY - (e.clientY - panOrigin.current.cy);
    }
  }, [graphPaperRef]);

  const stopPan = useCallback(() => {
    isPanning.current = false;
    graphPaperRef.current?.classList.remove('panning-active');
  }, [graphPaperRef]);

  useEffect(() => {
    const el = graphPaperRef.current;
    if (el) el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el?.removeEventListener('wheel', handleWheel);
  }, [handleWheel, graphPaperRef]);

  return { zoom, setZoom, startPan, pan, stopPan, isPanning };
}

// ─── Shared Block Navigation Hook ────────────────────────────────────
export function useBlockNavigation({ id, value, inputRef, gridSize = 20, onDelete, onEnter, onNudge, onLeaveBlock }) {
  return useCallback((e) => {
    if (e.key === 'Escape') { e.preventDefault(); inputRef.current?.blur(); onLeaveBlock(id, 'Escape'); return; }
    if (e.key === 'Tab') { e.preventDefault(); inputRef.current?.blur(); onLeaveBlock(id, e.shiftKey ? 'ShiftTab' : 'Tab'); return; }
    if (e.key.startsWith('Arrow') && !value) { e.preventDefault(); inputRef.current?.blur(); onDelete(id); onLeaveBlock(id, e.key); return; }
    if (e.key === 'Enter' && !e.shiftKey && e.target.tagName !== 'TEXTAREA') { e.preventDefault(); inputRef.current?.blur(); onEnter(id, false); return; }
    if (e.key === 'Enter' && e.shiftKey && e.target.tagName !== 'TEXTAREA') { e.preventDefault(); inputRef.current?.blur(); onEnter(id, true); return; }

    if (e.key.startsWith('Arrow') && (e.ctrlKey || e.metaKey || !value)) {
      e.preventDefault();
      const D = { ArrowUp: [0, -gridSize], ArrowDown: [0, gridSize], ArrowLeft: [-gridSize, 0], ArrowRight: [gridSize, 0] };
      onNudge(id, ...(D[e.key] ?? [0, 0]));
    }
  }, [id, value, inputRef, gridSize, onDelete, onEnter, onNudge, onLeaveBlock]);
}
