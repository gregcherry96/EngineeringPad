import React, { useEffect, useLayoutEffect, useRef } from 'react';
import { useWorkspaceActionData } from '../WorkspaceContext';

const GRID_SIZE = 20;

export default function TextBlock({ id, initialValue, setFocus }) {
  const { actions } = useWorkspaceActionData();
  const inputRef = useRef(null);

  const adjustHeight = () => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = `${inputRef.current.scrollHeight}px`;
    }
  };

  useLayoutEffect(() => { adjustHeight(); }, [initialValue]);

  useEffect(() => {
    if (inputRef.current && document.activeElement !== inputRef.current) {
      inputRef.current.focus();
      inputRef.current.setSelectionRange(initialValue.length, initialValue.length);
    }
    const resizeObserver = new ResizeObserver(() => adjustHeight());
    if (inputRef.current) resizeObserver.observe(inputRef.current);
    return () => resizeObserver.disconnect();
  }, [initialValue.length]);

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') { e.preventDefault(); inputRef.current?.blur(); actions.leaveBlock(id, 'Escape'); return; }
    if (e.key === 'Tab') { e.preventDefault(); inputRef.current?.blur(); actions.leaveBlock(id, e.shiftKey ? 'ShiftTab' : 'Tab'); return; }
    if (e.key.startsWith('Arrow') && !inputRef.current.value) { e.preventDefault(); inputRef.current?.blur(); actions.delete(id); actions.leaveBlock(id, e.key); return; }
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); inputRef.current?.blur(); actions.enter(id); return; }

    if (e.key.startsWith('Arrow') && (e.ctrlKey || e.metaKey || !inputRef.current.value)) {
      e.preventDefault();
      const D = { ArrowUp: [0, -GRID_SIZE], ArrowDown: [0, GRID_SIZE], ArrowLeft: [-GRID_SIZE, 0], ArrowRight: [GRID_SIZE, 0] };
      actions.nudge(id, ...(D[e.key] ?? [0, 0]));
    }
  };

  return (
    <textarea
      ref={inputRef}
      className="form-control border-0 bg-transparent text-dark p-0 shadow-none m-0"
      // Step 3: Change width to 100% so it perfectly hugs the resizable Rnd container
      style={{ width: '100%', resize: 'none', fontFamily: 'Lora, serif', fontSize: '1rem', lineHeight: '1.5', overflow: 'hidden' }}
      value={initialValue}
      onChange={e => {
        adjustHeight();
        actions.change(id, e.target.value);
      }}
      onKeyDown={handleKeyDown}
      onFocus={() => setFocus(true)}
      onBlur={() => { setFocus(false); if (!inputRef.current?.value.trim()) actions.delete(id); }}
      placeholder="Type your notes here... (Shift+Enter for new line)"
      rows={1}
      spellCheck={false}
    />
  );
}
