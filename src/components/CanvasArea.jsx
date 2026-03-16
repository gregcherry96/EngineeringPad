import React, { useState, useRef } from 'react';
import { useWorkspaceData, useWorkspaceInteraction } from '../WorkspaceContext';
import BlockWrapper from './BlockWrapper';

const GRID_SIZE = 20;

export default function CanvasArea({
  zoom, startPan, pan, stopPan, isPanning, spaceHeld, graphPaperRef,
  showGrid, paperMode, pageCount
}) {
  const { blocks, updateBlocks, actions } = useWorkspaceData();
  const { selectedIds, cursorPos } = useWorkspaceInteraction();
  const [marquee, setMarquee] = useState(null);
  const canvasRef = useRef(null);

  const canvasToWorld = (clientX, clientY) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    const wx = (clientX - rect.left) / zoom;
    const wy = (clientY - rect.top) / zoom;
    return { x: Math.round(wx / GRID_SIZE) * GRID_SIZE, y: Math.round(wy / GRID_SIZE) * GRID_SIZE };
  };

  const handleMouseDown = (e) => {
    if (e.button === 1 || spaceHeld.current) { startPan(e); return; }
    if (e.target.closest('.block-container') || e.target.closest('.sidebar-panel') || e.target.closest('.navbar')) return;

    if (paperMode && !e.target.closest('.canvas-area')) return;

    const { x, y } = canvasToWorld(e.clientX, e.clientY);
    setMarquee({ startX: x, startY: y, endX: x, endY: y });
    actions.select([]);
    actions.setCursorPos(null);
  };

  const handleMouseMove = (e) => {
    if (isPanning.current) { pan(e); return; }
    if (marquee) {
      const { x, y } = canvasToWorld(e.clientX, e.clientY);
      setMarquee(prev => ({ ...prev, endX: x, endY: y }));

      const minX = Math.min(marquee.startX, x);
      const maxX = Math.max(marquee.startX, x);
      const minY = Math.min(marquee.startY, y);
      const maxY = Math.max(marquee.startY, y);

      const newlySelected = blocks.filter(b =>
        b.x < maxX && b.x + 100 > minX && b.y < maxY && b.y + 40 > minY
      ).map(b => b.id);

      actions.select(newlySelected);
    }
  };

  const handleMouseUp = (e) => {
    if (isPanning.current) stopPan();
    if (marquee) {
      const dx = Math.abs(marquee.startX - marquee.endX);
      const dy = Math.abs(marquee.startY - marquee.endY);

      if (dx < 5 && dy < 5) {
        const { x, y } = canvasToWorld(e.clientX, e.clientY);
        actions.setCursorPos({ x, y });
        const hasEmpty = blocks.some(b => !b.expression.trim());
        if (hasEmpty) updateBlocks(p => p.filter(b => b.expression.trim()), true);
      }
      setMarquee(null);
    }
  };

  const maxW = Math.max(2000, ...blocks.map(b => b.x + 800), cursorPos ? cursorPos.x + 800 : 0);
  const maxH = Math.max(2000, ...blocks.map(b => b.y + 800), cursorPos ? cursorPos.y + 800 : 0);

  const canvasContent = (
    <>
      {cursorPos && selectedIds.length === 0 && <div className="canvas-crosshair" style={{ left: cursorPos.x, top: cursorPos.y }} />}
      {marquee && (
        <div style={{
          position: 'absolute', left: Math.min(marquee.startX, marquee.endX), top: Math.min(marquee.startY, marquee.endY),
          width: Math.abs(marquee.startX - marquee.endX), height: Math.abs(marquee.startY - marquee.endY),
          backgroundColor: 'rgba(13, 110, 253, 0.1)', border: '1px solid rgba(13, 110, 253, 0.5)', pointerEvents: 'none', zIndex: 100
        }} />
      )}
      {blocks.map(block => <BlockWrapper key={block.id} block={block} />)}
    </>
  );

  return (
    <div
      ref={graphPaperRef}
      className={`graph-paper flex-grow-1 ${paperMode ? 'paper-mode-backdrop' : 'infinite-canvas-bg'} ${!paperMode && showGrid ? 'grid-bg' : ''}`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {paperMode ? (
        <div className="d-flex justify-content-center" style={{ minWidth: `${794 * zoom + 80}px`, minHeight: `${1123 * pageCount * zoom + 80}px`, padding: '40px' }}>
          <div ref={canvasRef} className={`canvas-area a4-paper shadow ${showGrid ? 'grid-bg' : ''}`} style={{ transform: `scale(${zoom})`, width: '794px', height: `${1123 * pageCount}px`, flexShrink: 0 }}>
            {canvasContent}
          </div>
        </div>
      ) : (
        <div ref={canvasRef} className="canvas-area" style={{ transform: `scale(${zoom})`, width: `${maxW * zoom}px`, height: `${maxH * zoom}px` }}>
          {canvasContent}
        </div>
      )}
    </div>
  );
}
