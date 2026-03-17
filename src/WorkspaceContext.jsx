import React, { createContext, useContext, useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { useHistory, useMathEvaluation, useWorkspaceActions } from './hooks/index.js';
import { convertResult } from './utils/mathUtils';

export const WorkspaceDataContext = createContext({});
export const WorkspaceInteractionContext = createContext({});
export const WorkspaceActionsContext = createContext({});

export const makeBlock = (x, y, type = 'math') => ({ id: crypto.randomUUID(), x, y, type, expression: '', latex: '' });

export function useWorkspaceData() { return useContext(WorkspaceDataContext); }
export function useWorkspaceInteraction() { return useContext(WorkspaceInteractionContext); }
export function useWorkspaceActionData() { return useContext(WorkspaceActionsContext); }

export function useWorkspace() {
  return {
    ...useContext(WorkspaceDataContext),
    ...useContext(WorkspaceInteractionContext),
    ...useContext(WorkspaceActionsContext)
  };
}

export function WorkspaceProvider({ children }) {
  const getInitialBlocks = () => {
    try {
      const saved = JSON.parse(localStorage.getItem('mathpad-session'));
      if (saved?.savedBlocks) return saved.savedBlocks;
    } catch (e) {}
    return [];
  };

  // Step 2: Use useMemo to prevent re-parsing localStorage on every render for custom hook
  const initialBlocks = useMemo(() => getInitialBlocks(), []);
  const { state: blocks, setState: setBlocks, pushUndo, undo, redo, canUndo, canRedo, clearHistory } = useHistory(initialBlocks);

  const getInitialOverrides = () => {
    try {
      const saved = JSON.parse(localStorage.getItem('mathpad-session'));
      if (saved?.savedOverrides) return saved.savedOverrides;
    } catch (e) {}
    return {};
  };

  // Step 2: Lazy evaluation function passed to useState
  const [unitOverrides, setUnitOverrides] = useState(getInitialOverrides);
  const [activeDrag, setActiveDrag] = useState(null);
  const [cursorPos, setCursorPos] = useState(null);
  const [selectedIds, setSelectedIdsState] = useState([]);

  const blocksRef = useRef(blocks);
  const selectedIdsRef = useRef(selectedIds);
  const activeMathFieldRef = useRef(null);

  useEffect(() => { blocksRef.current = blocks; }, [blocks]);

  const setSelectedIds = useCallback((ids) => {
    setSelectedIdsState(prev => {
      const next = typeof ids === 'function' ? ids(prev) : ids;
      selectedIdsRef.current = next;
      return next;
    });
  }, []);

  const { results, userVars, rawResultsRef } = useMathEvaluation(blocks, unitOverrides, setUnitOverrides);

  const actionsHook = useWorkspaceActions({
    setBlocks, pushUndo, clearHistory, setSelectedIds,
    setUnitOverrides, setCursorPos, blocksRef, selectedIdsRef,
    rawResultsRef, convertResult
  });

  const actions = useMemo(() => ({
    ...actionsHook,
    drag: (id, dx, dy) => { if (selectedIdsRef.current.includes(id)) setActiveDrag({ id, dx, dy }); },
    dragStop: (id, dx, dy) => actionsHook.dragStop(id, dx, dy, setActiveDrag),
    resize: (id, width) => actionsHook.updateBlocks(p => p.map(b => b.id === id ? { ...b, width } : b), true),
    changeMath: (id, expression, latex) => actionsHook.updateBlocks(p => p.map(b => b.id === id ? { ...b, expression, latex } : b), true),
    loadWorkspace: (newBlocks, newOverrides = {}) => {
      setBlocks(newBlocks);
      setUnitOverrides(newOverrides);
      setSelectedIds([]);
      clearHistory();
      pushUndo(newBlocks);
    }
  }), [actionsHook, setBlocks, clearHistory, pushUndo, setSelectedIds]);

  useEffect(() => {
    const timerId = setTimeout(() => {
      localStorage.setItem('mathpad-session', JSON.stringify({ savedBlocks: blocks, savedOverrides: unitOverrides }));
    }, 500);
    return () => clearTimeout(timerId);
  }, [blocks, unitOverrides]);

  const dataState = useMemo(() => ({
    blocks, results, rawResultsRef, unitOverrides, userVars
  }), [blocks, results, unitOverrides, userVars]);

  const actionsState = useMemo(() => ({
    undo, redo, canUndo, canRedo, updateBlocks: actions.updateBlocks, actions
  }), [undo, redo, canUndo, canRedo, actions]);

  const interactionState = useMemo(() => ({
    selectedIds, activeDrag, cursorPos, activeMathFieldRef
  }), [selectedIds, activeDrag, cursorPos]);

  return (
    <WorkspaceDataContext.Provider value={dataState}>
      <WorkspaceActionsContext.Provider value={actionsState}>
        <WorkspaceInteractionContext.Provider value={interactionState}>
          {children}
        </WorkspaceInteractionContext.Provider>
      </WorkspaceActionsContext.Provider>
    </WorkspaceDataContext.Provider>
  );
}
