import React, { useEffect, useRef } from 'react';

const GRID_SIZE = 20;

export default function TextBlock({ id, initialValue, setFocus, onDelete, onChange, onEnter, onNudge, onLeaveBlock }) {
  const inputRef = useRef(null);

  const adjustHeight = () => {
    const el = inputRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = `${el.scrollHeight}px`;
    }
  };

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
      inputRef.current.setSelectionRange(initialValue.length, initialValue.length);
      adjustHeight();
    }
  }, [initialValue.length]);

  const handleChange = (e) => {
    adjustHeight();
    onChange(id, e.target.value);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      inputRef.current?.blur();
      onLeaveBlock(id, 'Escape');
      return;
    }
    
    // Tab navigation
    if (e.key === 'Tab') {
      e.preventDefault();
      inputRef.current?.blur();
      onLeaveBlock(id, e.shiftKey ? 'ShiftTab' : 'Tab');
      return;
    }
    
    if (e.key.startsWith('Arrow') && !inputRef.current.value) {
      e.preventDefault();
      inputRef.current?.blur();
      onDelete(id);
      onLeaveBlock(id, e.key);
      return;
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      inputRef.current?.blur();
      onEnter(id, false);
      return;
    }

    if (e.key.startsWith('Arrow') && (e.ctrlKey || e.metaKey || !inputRef.current.value)) {
      e.preventDefault();
      const D = { ArrowUp: [0, -GRID_SIZE], ArrowDown: [0, GRID_SIZE], ArrowLeft: [-GRID_SIZE, 0], ArrowRight: [GRID_SIZE, 0] };
      const [dx, dy] = D[e.key] ?? [0, 0];
      onNudge(id, dx, dy);
    }
  };

  const handleBlur = () => {
    setFocus(false);
    if (!inputRef.current?.value.trim()) {
      onDelete(id); 
    }
  };

  return (
    <textarea
      ref={inputRef}
      className="text-block-input"
      value={initialValue}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      onFocus={() => setFocus(true)}
      onBlur={handleBlur}
      placeholder="Type your notes here... (Shift+Enter for new line)"
      rows={1}
      spellCheck={false}
    />
  );
}