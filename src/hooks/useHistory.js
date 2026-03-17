import { useState, useRef, useCallback } from 'react';

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
