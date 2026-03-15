import React, { useEffect, useRef } from 'react';

const GRID_SIZE = 20;

export default function TextBlock({ id, initialValue, setFocus, onDelete, onChange, onEnter, onNudge }) {
  const inputRef = useRef(null);

  // Auto-resize the textarea to fit the content
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
      // Move cursor to the end of the text if it has an initial value
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
      inputRef.current?.blur();
      return;
    }
    // Shift+Enter creates a new line, but regular Enter creates a new MathBlock below
    if (e.key === 'Enter' && !e.shiftKey) {
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
      onDelete(id); // Delete if left totally empty
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
