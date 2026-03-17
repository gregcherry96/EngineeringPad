import { useCallback } from 'react';

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
