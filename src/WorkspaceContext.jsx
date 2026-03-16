import React, { createContext, useContext, useState, useRef, useMemo, useEffect } from 'react';
import { useHistory } from './hooks';
import { useMathEvaluation } from './hooks/useMathEvaluation';
import { convertResult } from './utils/mathUtils';

export const WorkspaceContext = createContext({});

export function useWorkspace() {
  return useContext(WorkspaceContext);
}

const GRID_SIZE = 20;
let nextId = 1;

export const makeBlock = (x, y, type = 'math') => ({ id: nextId++, x, y, type, expression: '' });

export function WorkspaceProvider({ children }) {
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
  const [unitOverrides, setUnitOverrides] = useState({});
  const [selectedIds, setSelectedIds] = useState([]);
  const [activeDrag, setActiveDrag] = useState(null);
  const [cursorPos, setCursorPos] = useState(null);

  const activeMathFieldRef = useRef(null);

  const { results, userVars, rawResultsRef } = useMathEvaluation(blocks, unitOverrides, setUnitOverrides);

  useEffect(() => {
    localStorage.setItem('mathpad-session', JSON.stringify({ savedBlocks: blocks, savedOverrides: unitOverrides }));
  }, [blocks, unitOverrides]);

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

  const workspaceState = useMemo(() => ({
    blocks, results, rawResultsRef, unitOverrides, userVars, selectedIds, activeDrag, activeMathFieldRef, cursorPos,
    undo, redo, canUndo, canRedo, updateBlocks,
    actions: {
      select: setSelectedIds, drag: handleDrag, dragStop: handleDragStop, delete: handleDelete,
      change: handleChange, enter: handleEnter, nudge: handleNudge,
      transform: handleTransform, unitChange: handleUnitChange, leaveBlock: handleLeaveBlock,
      clearWorkspace: handleClearWorkspace, setCursorPos
    }
  }), [blocks, results, unitOverrides, userVars, selectedIds, activeDrag, cursorPos, undo, redo, canUndo, canRedo]);

  return (
    <WorkspaceContext.Provider value={workspaceState}>
      {children}
    </WorkspaceContext.Provider>
  );
}
