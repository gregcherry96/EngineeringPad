import { useCallback } from 'react';
import { GRID_SIZE } from '../utils/canvasConfig';

export function useWorkspaceActions({
  setBlocks, pushUndo, clearHistory,
  setSelectedIds, setUnitOverrides, setCursorPos,
  blocksRef, selectedIdsRef, rawResultsRef,
  convertResult
}) {
  const updateBlocks = useCallback((updater, pushHistory = false) => {
    setBlocks(prev => {
      if (pushHistory) pushUndo(prev);
      return updater(prev);
    });
  }, [pushUndo, setBlocks]);

  const handleChange = useCallback((id, expression) =>
    updateBlocks(p => p.map(b => b.id === id ? { ...b, expression } : b)), [updateBlocks]);

  const handleTransform = useCallback((id, type) =>
    updateBlocks(p => p.map(b => b.id === id ? { ...b, type, expression: '' } : b)), [updateBlocks]);

  const handleDrag = useCallback((id, dx, dy) => {
    // setActiveDrag logic usually stays in provider state, but we call it here if needed
  }, []);

  const handleDragStop = useCallback((id, dx, dy, setActiveDrag) => {
    setActiveDrag(null);
    if (dx !== 0 || dy !== 0) {
      const idsToMove = selectedIdsRef.current.includes(id) ? selectedIdsRef.current : [id];
      updateBlocks(p => p.map(b => idsToMove.includes(b.id) ? { ...b, x: b.x + dx, y: b.y + dy } : b), true);
    }
  }, [updateBlocks, selectedIdsRef]);

  const handleNudge = useCallback((id, dx, dy) => {
    const idsToNudge = selectedIdsRef.current.includes(id) ? selectedIdsRef.current : [id];
    updateBlocks(p => p.map(b => idsToNudge.includes(b.id) ? { ...b, x: b.x + dx, y: b.y + dy } : b));
  }, [updateBlocks, selectedIdsRef]);

  const handleDelete = useCallback((id) => {
    const idsToDelete = selectedIdsRef.current.includes(id) ? selectedIdsRef.current : [id];
    updateBlocks(p => p.filter(b => !idsToDelete.includes(b.id)), true);
    setSelectedIds([]);
    setUnitOverrides(p => {
      const n = { ...p };
      idsToDelete.forEach(dId => delete n[dId]);
      return n;
    });
  }, [updateBlocks, selectedIdsRef, setSelectedIds, setUnitOverrides]);

  const handleUnitChange = useCallback((id, targetUnit) => {
    if (!targetUnit) {
      setUnitOverrides(p => { const n = { ...p }; delete n[id]; return n; });
      return { ok: true };
    }
    const raw = rawResultsRef.current[id];
    if (!raw) return { ok: false };
    try {
      convertResult(raw, targetUnit);
      setUnitOverrides(p => ({ ...p, [id]: targetUnit }));
      return { ok: true };
    } catch { return { ok: false }; }
  }, [rawResultsRef, setUnitOverrides, convertResult]);

  const handleEnter = useCallback((id) => {
    const cur = blocksRef.current.find(b => b.id === id);
    if (!cur) return;
    setCursorPos({ x: cur.x, y: cur.y + 60 });
    setSelectedIds([]);
  }, [blocksRef, setCursorPos, setSelectedIds]);

  const handleLeaveBlock = useCallback((id, key) => {
    const sorted = [...blocksRef.current].sort((a, b) =>
      Math.abs(a.y - b.y) < GRID_SIZE ? a.x - b.x : a.y - b.y);
    const idx = sorted.findIndex(b => b.id === id);
    if (key === 'Tab' || key === 'ShiftTab') {
      const nextIdx = key === 'Tab' ? idx + 1 : idx - 1;
      if (sorted[nextIdx]) { setSelectedIds([sorted[nextIdx].id]); setCursorPos(null); }
      else { setCursorPos({ x: sorted[idx].x, y: sorted[idx].y + 60 }); setSelectedIds([]); }
      return;
    }
    setSelectedIds([]);
  }, [blocksRef, setSelectedIds, setCursorPos]);

  const handleClearWorkspace = useCallback(() => {
    if (!window.confirm('Clear the entire workspace?')) return;
    setBlocks(prev => { pushUndo(prev); return []; });
    setUnitOverrides({}); setSelectedIds([]); setCursorPos(null); clearHistory();
  }, [setBlocks, pushUndo, setUnitOverrides, setSelectedIds, setCursorPos, clearHistory]);

  return {
    select: setSelectedIds,
    dragStop: handleDragStop,
    delete: handleDelete,
    change: handleChange,
    enter: handleEnter,
    nudge: handleNudge,
    transform: handleTransform,
    unitChange: handleUnitChange,
    leaveBlock: handleLeaveBlock,
    clearWorkspace: handleClearWorkspace,
    setCursorPos,
    updateBlocks
  };
}
