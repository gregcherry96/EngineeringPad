import { useEffect } from 'react';
import { makeBlock } from '../WorkspaceContext';
import { SHORTCUT_TEXT, SHORTCUT_SECTION } from '../utils/keyboardConfig';

export function useGlobalShortcuts({
  blocks,
  selectedIds,
  cursorPos,
  undo,
  redo,
  actions,
  updateBlocks,
  spaceHeld,
  graphPaperRef
}) {
  useEffect(() => {
    const handleKey = (e) => {
      if (e.target.closest('input, textarea, math-field')) return;

      if (e.key === 'Backspace' || e.key === 'Delete') {
        if (selectedIds.length > 0) { e.preventDefault(); actions.delete(selectedIds[0]); }
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); undo(); }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) { e.preventDefault(); redo(); }
      if (e.code === 'Space') { e.preventDefault(); spaceHeld.current = true; graphPaperRef.current?.classList.add('panning-mode'); }

      // Create new blocks based on shortcuts
      if (cursorPos && e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();

        let type = 'math';
        if (SHORTCUT_TEXT.includes(e.key)) type = 'text';
        if (SHORTCUT_SECTION.includes(e.key)) type = 'section';

        const newBlock = makeBlock(cursorPos.x, cursorPos.y, type);
        newBlock.expression = type === 'math' ? e.key : '';

        updateBlocks(p => [...p, newBlock], true);
        actions.select([newBlock.id]);
        actions.setCursorPos(null);
      }
    };

    const handleKeyUp = (e) => {
      if (e.code === 'Space') {
        spaceHeld.current = false;
        graphPaperRef.current?.classList.remove('panning-mode');
      }
    };

    window.addEventListener('keydown', handleKey);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKey);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [cursorPos, undo, redo, blocks, selectedIds, actions, updateBlocks, spaceHeld, graphPaperRef]);
}
