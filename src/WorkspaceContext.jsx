import React, { createContext, useContext, useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { useHistory } from './hooks';
import { useMathEvaluation } from './hooks/useMathEvaluation';
import { convertResult } from './utils/mathUtils';

export const WorkspaceDataContext = createContext({});
export const WorkspaceInteractionContext = createContext({});

export function useWorkspaceData() { return useContext(WorkspaceDataContext); }
export function useWorkspaceInteraction() { return useContext(WorkspaceInteractionContext); }

// Fallback logic for untouched components avoiding immediate breakages
export function useWorkspace() {
  return { ...useContext(WorkspaceDataContext), ...useContext(WorkspaceInteractionContext) };
}

const GRID_SIZE = 20;

export const makeBlock = (x, y, type = 'math') => ({ id: crypto.randomUUID(), x, y, type, expression: '' });

export function WorkspaceProvider({ children }) {
  const getInitialBlocks = () => {
    try {
      const saved = JSON.parse(localStorage.getItem('mathpad-session'));
      if (saved?.savedBlocks) return saved.savedBlocks;
    } catch (e) {}
    return [];
  };

  const { state: blocks, setState: setBlocks, pushUndo, undo, redo, canUndo, canRedo, clearHistory } = useHistory(getInitialBlocks());
  const [unitOverrides, setUnitOverrides] = useState({});
  const [activeDrag, setActiveDrag] = useState(null);
  const [cursorPos, setCursorPos] = useState(null);

  // Transient state tracked securely via Ref to prevent cascading data re-renders
  const [selectedIds, setSelectedIdsState] = useState([]);
  const selectedIdsRef = useRef([]);
  const setSelectedIds = useCallback((ids) => {
    setSelectedIdsState(prev => {
      const next = typeof ids === 'function' ? ids(prev) : ids;
      selectedIdsRef.current = next;
      return next;
    });
  }, []);

  const activeMathFieldRef = useRef(null);

  const { results, userVars, rawResultsRef } = useMathEvaluation(blocks, unitOverrides, setUnitOverrides);

  useEffect(() => {
    localStorage.setItem('mathpad-session', JSON.stringify({ savedBlocks: blocks, savedOverrides: unitOverrides }));
  }, [blocks, unitOverrides]);

  const blocksRef = useRef(blocks);
  useEffect(() => { blocksRef.current = blocks; }, [blocks]);

  const updateBlocks = useCallback((updater, pushHistory = false) => {
    setBlocks(prev => {
      if (pushHistory) pushUndo(prev);
      return updater(prev);
    });
  }, [pushUndo, setBlocks]);

  const handleChange = useCallback((id, expression) => updateBlocks(p => p.map(b => b.id === id ? { ...b, expression } : b)), [updateBlocks]);
  const handleTransform = useCallback((id, type) => updateBlocks(p => p.map(b => b.id === id ? { ...b, type, expression: '' } : b)), [updateBlocks]);

  const handleDrag = useCallback((id, dx, dy) => {
    if (selectedIdsRef.current.includes(id)) setActiveDrag({ id, dx, dy });
  }, []);

  const handleDragStop = useCallback((id, dx, dy) => {
    setActiveDrag(null);
    if (dx !== 0 || dy !== 0) {
      const idsToMove = selectedIdsRef.current.includes(id) ? selectedIdsRef.current : [id];
      updateBlocks(p => p.map(b => idsToMove.includes(b.id) ? { ...b, x: b.x + dx, y: b.y + dy } : b), true);
    }
  }, [updateBlocks]);

  const handleNudge = useCallback((id, dx, dy) => {
    const idsToNudge = selectedIdsRef.current.includes(id) ? selectedIdsRef.current : [id];
    updateBlocks(p => p.map(b => idsToNudge.includes(b.id) ? { ...b, x: b.x + dx, y: b.y + dy } : b));
  }, [updateBlocks]);

  const handleDelete = useCallback((id) => {
    const idsToDelete = selectedIdsRef.current.includes(id) ? selectedIdsRef.current : [id];
    updateBlocks(p => p.filter(b => !idsToDelete.includes(b.id)), true);
    setSelectedIds([]);
    setUnitOverrides(p => { const n = { ...p }; idsToDelete.forEach(dId => delete n[dId]); return n; });
  }, [updateBlocks, setSelectedIds]);

  const handleClearWorkspace = useCallback(() => {
    if (!window.confirm('Clear the entire workspace?')) return;
    setBlocks(prev => { pushUndo(prev); return []; });
    setUnitOverrides({});
    setSelectedIds([]);
    setCursorPos(null);
    clearHistory();
  }, [setBlocks, pushUndo, clearHistory, setSelectedIds]);

  const handleUnitChange = useCallback((id, targetUnit) => {
    if (!targetUnit) { setUnitOverrides(p => { const n = { ...p }; delete n[id]; return n; }); return { ok: true }; }
    const raw = rawResultsRef.current[id];
    if (!raw) return { ok: false };
    try { convertResult(raw, targetUnit); setUnitOverrides(p => ({ ...p, [id]: targetUnit })); return { ok: true }; }
    catch { return { ok: false }; }
  }, []);

  const handleEnter = useCallback((id) => {
    const cur = blocksRef.current.find(b => b.id === id);
    if (!cur) return;
    setCursorPos({ x: cur.x, y: cur.y + 60 });
    setSelectedIds([]);
  }, [setSelectedIds]);

  const handleLeaveBlock = useCallback((id, key) => {
    const sorted = [...blocksRef.current].sort((a, b) => Math.abs(a.y - b.y) < GRID_SIZE ? a.x - b.x : a.y - b.y);
    const idx = sorted.findIndex(b => b.id === id);
    if (key === 'Tab' || key === 'ShiftTab') {
      const nextIdx = key === 'Tab' ? idx + 1 : idx - 1;
      if (sorted[nextIdx]) { setSelectedIds([sorted[nextIdx].id]); setCursorPos(null); }
      else { setCursorPos({ x: sorted[idx].x, y: sorted[idx].y + 60 }); setSelectedIds([]); }
      return;
    }
    setSelectedIds([]);
  }, [setSelectedIds]);

  const actions = useMemo(() => ({
    select: setSelectedIds, drag: handleDrag, dragStop: handleDragStop, delete: handleDelete,
    change: handleChange, enter: handleEnter, nudge: handleNudge,
    transform: handleTransform, unitChange: handleUnitChange, leaveBlock: handleLeaveBlock,
    clearWorkspace: handleClearWorkspace, setCursorPos
  }), [setSelectedIds, handleDrag, handleDragStop, handleDelete, handleChange, handleEnter, handleNudge, handleTransform, handleUnitChange, handleLeaveBlock, handleClearWorkspace]);

  // Exposing shared references in both contexts limits component rewrites,
  // but strictly segregates variables triggering React refreshes.
  const dataState = useMemo(() => ({
    blocks, results, rawResultsRef, unitOverrides, userVars,
    undo, redo, canUndo, canRedo, updateBlocks, actions, activeMathFieldRef
  }), [blocks, results, unitOverrides, userVars, undo, redo, canUndo, canRedo, updateBlocks, actions]);

  const interactionState = useMemo(() => ({
    selectedIds, activeDrag, cursorPos, actions, activeMathFieldRef
  }), [selectedIds, activeDrag, cursorPos, actions]);

  return (
    <WorkspaceDataContext.Provider value={dataState}>
      <WorkspaceInteractionContext.Provider value={interactionState}>
        {children}
      </WorkspaceInteractionContext.Provider>
    </WorkspaceDataContext.Provider>
  );
}
