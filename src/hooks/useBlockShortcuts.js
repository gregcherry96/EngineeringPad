import { useRef, useCallback } from 'react';
import {
  SHORTCUT_TEXT, SHORTCUT_SECTION, SHORTCUT_LEAVE_ESCAPE,
  SHORTCUT_LEAVE_ENTER, SHORTCUT_LEAVE_TAB, SHORTCUT_NUDGE_UP,
  SHORTCUT_NUDGE_DOWN, SHORTCUT_NUDGE_LEFT, SHORTCUT_NUDGE_RIGHT
} from '../utils/keyboardConfig';

const GRID_SIZE = 20;

export function useBlockShortcuts(id, actions) {
  const isTransforming = useRef(false);

  const handleKeyDown = useCallback((e, mf) => {
    const value = mf.getValue();
    if (!value) {
      if (SHORTCUT_TEXT.includes(e.key)) { e.preventDefault(); isTransforming.current = true; actions.transform(id, 'text'); return; }
      if (SHORTCUT_SECTION.includes(e.key)) { e.preventDefault(); isTransforming.current = true; actions.transform(id, 'section'); return; }
      if (e.key.startsWith('Arrow')) { e.preventDefault(); mf.blur(); actions.delete(id); actions.leaveBlock(id, e.key); return; }
    }

    if (e.key === SHORTCUT_LEAVE_ESCAPE) { e.preventDefault(); mf.blur(); actions.leaveBlock(id, 'Escape'); return; }
    if (e.key === SHORTCUT_LEAVE_ENTER) { e.preventDefault(); mf.blur(); actions.enter(id); return; }
    if (e.key === SHORTCUT_LEAVE_TAB) { e.preventDefault(); mf.blur(); actions.leaveBlock(id, e.shiftKey ? 'ShiftTab' : 'Tab'); return; }

    if (e.key.startsWith('Arrow') && (e.ctrlKey || e.metaKey || !value)) {
      e.preventDefault();
      const D = {
        [SHORTCUT_NUDGE_UP]: [0, -GRID_SIZE], [SHORTCUT_NUDGE_DOWN]: [0, GRID_SIZE],
        [SHORTCUT_NUDGE_LEFT]: [-GRID_SIZE, 0], [SHORTCUT_NUDGE_RIGHT]: [GRID_SIZE, 0]
      };
      actions.nudge(id, ...(D[e.key] ?? [0,0]));
    }
  }, [id, actions]);

  return { handleKeyDown, isTransforming };
}
