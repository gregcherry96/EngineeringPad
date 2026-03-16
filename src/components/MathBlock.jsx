import React, { useEffect, useRef, useState } from 'react';
import { sanitizeMath } from '../utils/mathSanitize';
import { useWorkspaceData } from '../WorkspaceContext';
import MathFieldWrapper from './MathFieldWrapper';
import MathResult from './MathResult';
import {
  SHORTCUT_TEXT, SHORTCUT_SECTION, SHORTCUT_LEAVE_ESCAPE,
  SHORTCUT_LEAVE_ENTER, SHORTCUT_LEAVE_TAB, SHORTCUT_NUDGE_UP,
  SHORTCUT_NUDGE_DOWN, SHORTCUT_NUDGE_LEFT, SHORTCUT_NUDGE_RIGHT
} from '../utils/keyboardConfig';

const GRID_SIZE = 20;

export default function MathBlock({ id, initialValue, setFocus }) {
  const { results, actions, activeMathFieldRef } = useWorkspaceData();
  const res = results[id] ?? {};
  const [isStale, setIsStale] = useState(false);
  const mathFieldRef = useRef(null);
  const isTransforming = useRef(false);

  useEffect(() => { setIsStale(false); }, [results[id]]);

  const handleInput = (e, mf) => {
    setIsStale(true);
    actions.change(id, sanitizeMath(mf.getValue('ascii-math')));
  };

  const handleFocusIn = (e, mf) => {
    setFocus(true);
    if (activeMathFieldRef) activeMathFieldRef.current = mf;
  };

  const handleFocusOut = (e, mf) => {
    setFocus(false);
    if (!mf.getValue() && !isTransforming.current) actions.delete(id);
  };

  const handleKeyDown = (e, mf) => {
    if (!mf.getValue()) {
      if (SHORTCUT_TEXT.includes(e.key)) { e.preventDefault(); isTransforming.current = true; actions.transform(id, 'text'); return; }
      if (SHORTCUT_SECTION.includes(e.key)) { e.preventDefault(); isTransforming.current = true; actions.transform(id, 'section'); return; }
      if (e.key.startsWith('Arrow')) { e.preventDefault(); mf.blur(); actions.delete(id); actions.leaveBlock(id, e.key); return; }
    }

    if (e.key === SHORTCUT_LEAVE_ESCAPE) { e.preventDefault(); mf.blur(); actions.leaveBlock(id, 'Escape'); return; }
    if (e.key === SHORTCUT_LEAVE_ENTER) { e.preventDefault(); mf.blur(); actions.enter(id); return; }
    if (e.key === SHORTCUT_LEAVE_TAB) { e.preventDefault(); mf.blur(); actions.leaveBlock(id, e.shiftKey ? 'ShiftTab' : 'Tab'); return; }

    if (e.key.startsWith('Arrow') && (e.ctrlKey || e.metaKey || !mf.getValue())) {
      e.preventDefault();
      const D = {
        [SHORTCUT_NUDGE_UP]: [0, -GRID_SIZE], [SHORTCUT_NUDGE_DOWN]: [0, GRID_SIZE],
        [SHORTCUT_NUDGE_LEFT]: [-GRID_SIZE, 0], [SHORTCUT_NUDGE_RIGHT]: [GRID_SIZE, 0]
      };
      actions.nudge(id, ...(D[e.key] ?? [0,0]));
    }
  };

  return (
    <>
      <MathFieldWrapper
        ref={mathFieldRef}
        style={{ minWidth: '30px' }}
        value={initialValue}
        onInput={handleInput}
        onFocusIn={handleFocusIn}
        onFocusOut={handleFocusOut}
        onKeyDown={handleKeyDown}
      />
      <MathResult id={id} res={res} isStale={isStale} />
    </>
  );
}
