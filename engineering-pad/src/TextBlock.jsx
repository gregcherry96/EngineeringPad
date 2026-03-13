import React, { useEffect, useRef, useState } from 'react';

export default function TextBlock({
  id, initialValue = '', setFocus, onDelete, onChange, onEnter, onNudge
}) {
  const ref = useRef(null);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (ref.current) {
      ref.current.focus();
      const len = ref.current.value.length;
      ref.current.setSelectionRange(len, len);
      autoSize(ref.current);
    }
  }, []);

  function autoSize(el) { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; }

  const handleInput = e => { autoSize(e.target); onChange(id, e.target.value); };

  const handleKeyDown = e => {
    if (e.key === 'Escape') { ref.current.blur(); return; }
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); ref.current.blur(); onEnter(id); return; }
    if ((e.ctrlKey || e.metaKey) && e.key.startsWith('Arrow')) {
      e.preventDefault();
      if (e.key === 'ArrowUp')    onNudge(id, 0, -20);
      if (e.key === 'ArrowDown')  onNudge(id, 0,  20);
      if (e.key === 'ArrowLeft')  onNudge(id, -20, 0);
      if (e.key === 'ArrowRight') onNudge(id,  20, 0);
    }
  };

  const handleFocus = () => { setFocus(true); setFocused(true); };
  const handleBlur  = e => {
    setFocus(false); setFocused(false);
    if (!e.target.value.trim()) onDelete(id);
  };

  return (
    <div className={`text-block-wrapper${focused ? ' focused' : ''}`}>
      <textarea
        ref={ref}
        className="text-block-textarea"
        defaultValue={initialValue}
        onInput={handleInput}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder="Type notes here…"
        rows={1}
      />
    </div>
  );
}
