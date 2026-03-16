import React, { useEffect, useRef } from 'react';

const GRID_SIZE = 20;

export default function SectionBlock({ id, initialValue, setFocus, onDelete, onChange, onEnter, onNudge, onLeaveBlock }) {
  const inputRef = useRef(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

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

    if (e.key === 'Enter') {
      e.preventDefault();
      inputRef.current?.blur();
      onEnter(id, e.shiftKey);
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
    <input
      ref={inputRef}
      className="section-block-input"
      type="text"
      value={initialValue}
      onChange={e => onChange(id, e.target.value)}
      onKeyDown={handleKeyDown}
      onFocus={() => setFocus(true)}
      onBlur={handleBlur}
      placeholder="Section Heading"
      spellCheck={false}
    />
  );
}