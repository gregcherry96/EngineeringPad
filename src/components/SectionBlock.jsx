import React, { useEffect, useRef } from 'react';
import { useBlockNavigation } from '../hooks';
import { useWorkspaceData } from '../WorkspaceContext';

export default function SectionBlock({ id, initialValue, setFocus }) {
const { actions } = useWorkspaceData();
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const handleKeyDown = useBlockNavigation({
    id, value: inputRef.current?.value, inputRef,
    onDelete: actions.delete, onEnter: actions.enter,
    onNudge: actions.nudge, onLeaveBlock: actions.leaveBlock
  });

  return (
    <input
      ref={inputRef}
      className="form-control form-control-lg border-0 bg-transparent fw-bold text-dark p-0 shadow-none m-0"
      style={{ width: '600px', fontSize: '1.5rem', fontFamily: 'Inter, sans-serif' }}
      type="text"
      value={initialValue}
      onChange={e => actions.change(id, e.target.value)}
      onKeyDown={handleKeyDown}
      onFocus={() => setFocus(true)}
      onBlur={() => { setFocus(false); if (!inputRef.current?.value.trim()) actions.delete(id); }}
      placeholder="Section Heading"
      spellCheck={false}
    />
  );
}
