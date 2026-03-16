import { useState, useRef } from 'react';
import { usePanZoom } from './hooks';
import { WorkspaceProvider, useWorkspaceData, useWorkspaceInteraction } from './WorkspaceContext';
import Sidebar from './components/Sidebar';
import Toolbar from './components/Toolbar';
import CanvasArea from './components/CanvasArea';
import { useGlobalShortcuts } from './hooks/useGlobalShortcuts';
import './App.css';

function AppContent() {
  const {
    blocks, undo, redo, canUndo, canRedo, updateBlocks, userVars,
    actions
  } = useWorkspaceData();

  const { selectedIds, cursorPos, activeMathFieldRef } = useWorkspaceInteraction();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [paperMode, setPaperMode] = useState(false);
  const [pageCount, setPageCount] = useState(1);

  const graphPaperRef = useRef(null);
  const spaceHeld = useRef(false);

  const { zoom, setZoom, startPan, pan, stopPan, isPanning } = usePanZoom(graphPaperRef);

  useGlobalShortcuts({
    blocks, selectedIds, cursorPos, undo, redo, actions, updateBlocks, spaceHeld, graphPaperRef
  });

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
