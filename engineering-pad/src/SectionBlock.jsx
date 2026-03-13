import React, { useEffect, useRef } from 'react';

export default function SectionBlock({
  id, initialValue = '', setFocus, onDelete, onChange, onEnter, onNudge
}) {
  const ref = useRef(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.focus();
      const len = ref.current.value.length;
      ref.current.setSelectionRange(len, len);
    }
  }, []);

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') { ref.current.blur(); return; }
    if (e.key === 'Enter') {
      e.preventDefault();
      ref.current.blur();
      onEnter(id);
    }
    if ((e.ctrlKey || e.metaKey) && e.key.startsWith('Arrow')) {
      e.preventDefault();
      const step = 20;
      if (e.key === 'ArrowUp')    onNudge(id, 0, -step);
      if (e.key === 'ArrowDown')  onNudge(id, 0,  step);
      if (e.key === 'ArrowLeft')  onNudge(id, -step, 0);
      if (e.key === 'ArrowRight') onNudge(id,  step, 0);
    }
  };

  const handleBlur = (e) => {
    setFocus(false);
    if (!e.target.value.trim()) onDelete(id);
  };

  return (
    <input
      ref={ref}
      type="text"
      className="section-block-input"
      defaultValue={initialValue}
      onChange={e => onChange(id, e.target.value)}
      onFocus={() => setFocus(true)}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      placeholder="Section heading…"
      spellCheck={false}
    />
  );
}
