import React, { useEffect, useRef } from 'react';

const GRID_SIZE = 20;

export default function SectionBlock({ id, initialValue, setFocus, onDelete, onChange, onEnter, onNudge }) {
  const inputRef = useRef(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      inputRef.current?.blur();
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      inputRef.current?.blur();
      onEnter(id);
      return;
    }
    // Nudging with arrow keys (Ctrl + Arrow)
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
      onDelete(id); // Delete if empty
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
