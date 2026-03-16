import React, { createContext, useContext, useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { useHistory } from './hooks';
import { useMathEvaluation } from './hooks/useMathEvaluation';
import { convertResult } from './utils/mathUtils';
import { useWorkspaceActions } from './hooks/useWorkspaceActions';

export const WorkspaceDataContext = createContext({});
export const WorkspaceInteractionContext = createContext({});

// Helper for other components to create new blocks
export const makeBlock = (x, y, type = 'math') => ({ id: crypto.randomUUID(), x, y, type, expression: '' });

export function useWorkspaceData() { return useContext(WorkspaceDataContext); }
export function useWorkspaceInteraction() { return useContext(WorkspaceInteractionContext); }

// Combined hook to prevent errors in components still using useWorkspace
export function useWorkspace() {
  return { ...useContext(WorkspaceDataContext), ...useContext(WorkspaceInteractionContext) };
}

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
    dragStop: (id, dx, dy) => actionsHook.dragStop(id, dx, dy, setActiveDrag)
  }), [actionsHook]);

  useEffect(() => {
    const timerId = setTimeout(() => {
      localStorage.setItem('mathpad-session', JSON.stringify({ savedBlocks: blocks, savedOverrides: unitOverrides }));
    }, 500);
    return () => clearTimeout(timerId);
  }, [blocks, unitOverrides]);

  const dataState = useMemo(() => ({
    blocks, results, rawResultsRef, unitOverrides, userVars,
    undo, redo, canUndo, canRedo, updateBlocks: actions.updateBlocks, actions, activeMathFieldRef
  }), [blocks, results, unitOverrides, userVars, undo, redo, canUndo, canRedo, actions]);

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
