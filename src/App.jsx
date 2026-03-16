import { useState, useRef, useEffect } from 'react';
import { usePanZoom } from './hooks';
import { WorkspaceProvider, useWorkspace, makeBlock } from './WorkspaceContext';
import Sidebar from './components/Sidebar';
import Toolbar from './components/Toolbar';
import CanvasArea from './components/CanvasArea';
import './App.css';

function AppContent() {
  const {
    blocks, selectedIds, cursorPos, activeMathFieldRef,
    undo, redo, canUndo, canRedo, updateBlocks, userVars,
    actions
  } = useWorkspace();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [paperMode, setPaperMode] = useState(false);
  const [pageCount, setPageCount] = useState(1);

  const graphPaperRef = useRef(null);
  const spaceHeld = useRef(false);

  const { zoom, setZoom, startPan, pan, stopPan, isPanning } = usePanZoom(graphPaperRef);

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

      if (cursorPos && e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        const type = e.key === '"' || e.key === "'" ? 'text' : e.key === '#' ? 'section' : 'math';
        const newBlock = makeBlock(cursorPos.x, cursorPos.y, type);
        newBlock.expression = type === 'math' ? e.key : '';
        updateBlocks(p => [...p, newBlock], true);
        actions.select([newBlock.id]); actions.setCursorPos(null);
      }
    };

    const handleKeyUp = (e) => { if (e.code === 'Space') { spaceHeld.current = false; graphPaperRef.current?.classList.remove('panning-mode'); } };

    window.addEventListener('keydown', handleKey); window.addEventListener('keyup', handleKeyUp);
    return () => { window.removeEventListener('keydown', handleKey); window.removeEventListener('keyup', handleKeyUp); };
  }, [cursorPos, undo, redo, blocks, selectedIds, actions, updateBlocks]);

  return (
    <div className="d-flex flex-column vh-100 vw-100 overflow-hidden">
      <Toolbar
        onUndo={undo} onRedo={redo} canUndo={canUndo} canRedo={canRedo} onClear={actions.clearWorkspace}
        zoom={zoom} onZoomChange={(val) => val === 'reset' ? setZoom(1) : setZoom(z => Math.max(0.3, Math.min(3, z + val)))}
        showGrid={showGrid} onToggleGrid={() => setShowGrid(!showGrid)}
        paperMode={paperMode} onTogglePaper={() => setPaperMode(!paperMode)}
        onAddPage={() => setPageCount(p => p + 1)}
        onRemovePage={() => setPageCount(p => Math.max(1, p - 1))}
        pageCount={pageCount}
      />

      <div className="d-flex flex-grow-1 overflow-hidden">
        <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} userVars={userVars} onInsert={(str) => { if(activeMathFieldRef.current) activeMathFieldRef.current.executeCommand(['insert', str]); activeMathFieldRef.current?.focus();}} />

        <CanvasArea
          zoom={zoom}
          startPan={startPan}
          pan={pan}
          stopPan={stopPan}
          isPanning={isPanning}
          spaceHeld={spaceHeld}
          graphPaperRef={graphPaperRef}
          showGrid={showGrid}
          paperMode={paperMode}
          pageCount={pageCount}
        />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <WorkspaceProvider>
      <AppContent />
    </WorkspaceProvider>
  );
}
