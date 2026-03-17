import React, { useEffect, useLayoutEffect, useRef } from 'react';
import { useBlockNavigation } from '../hooks';
import { useWorkspaceActionData } from '../WorkspaceContext';

export default function SectionBlock({ id, initialValue, setFocus }) {
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

  const handleKeyDown = useBlockNavigation({
    id, value: inputRef.current?.value, inputRef,
    onDelete: actions.delete, onEnter: actions.enter,
    onNudge: actions.nudge, onLeaveBlock: actions.leaveBlock
  });

  return (
    <textarea
      ref={inputRef}
      className="form-control form-control-lg border-0 bg-transparent fw-bold text-dark p-0 shadow-none m-0"
      // Step 3: Change width to 100% so it hugs the resizable Rnd container
      style={{
        width: '100%',
        fontSize: '1.5rem',
        fontFamily: 'Inter, sans-serif',
        resize: 'none',
        overflow: 'hidden'
      }}
      value={initialValue}
      onChange={e => {
        adjustHeight();
        actions.change(id, e.target.value);
      }}
      onKeyDown={handleKeyDown}
      onFocus={() => setFocus(true)}
      onBlur={() => { setFocus(false); if (!inputRef.current?.value.trim()) actions.delete(id); }}
      placeholder="Section Heading"
      rows={1}
      spellCheck={false}
    />
  );
}
