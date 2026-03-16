import React, { useState, useRef } from 'react';
import { useWorkspaceData, useWorkspaceInteraction } from '../WorkspaceContext';
import BlockWrapper from './BlockWrapper';
import { GRID_SIZE, PAPER_SIZES } from '../utils/canvasConfig';
import { calculateWorldCoordinates, calculateMarqueeBounds } from '../utils/canvasUtils';

export default function CanvasArea({
  zoom, startPan, pan, stopPan, isPanning, spaceHeld, graphPaperRef,
  showGrid, paperMode, pageCount
}) {
  const { blocks, updateBlocks, actions } = useWorkspaceData();
  const { selectedIds, cursorPos } = useWorkspaceInteraction();
  const [marquee, setMarquee] = useState(null);
  const canvasRef = useRef(null);

  const canvasToWorld = (clientX, clientY) => {
    return calculateWorldCoordinates(clientX, clientY, canvasRef.current?.getBoundingClientRect(), zoom, GRID_SIZE);
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

      const bounds = calculateMarqueeBounds({ ...marquee, endX: x, endY: y });

      const newlySelected = blocks.filter(b =>
        b.x < bounds.maxX && b.x + 100 > bounds.minX && b.y < bounds.maxY && b.y + 40 > bounds.minY
      ).map(b => b.id);

      actions.select(newlySelected);
    }
  };

  const handleMouseUp = (e) => {
    if (isPanning.current) stopPan();
    if (marquee) {
      const bounds = calculateMarqueeBounds(marquee);

      if (bounds.dx < 5 && bounds.dy < 5) {
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

  const a4 = PAPER_SIZES.A4;

  const canvasContent = (
    <>
      {cursorPos && selectedIds.length === 0 && <div className="canvas-crosshair" style={{ left: cursorPos.x, top: cursorPos.y }} />}
      {marquee && (() => {
        const bounds = calculateMarqueeBounds(marquee);
        return (
          <div className="canvas-marquee" style={{
            left: bounds.minX, top: bounds.minY,
            width: bounds.width, height: bounds.height
          }} />
        );
      })()}
      {blocks.map(block => <BlockWrapper key={block.id} block={block} />)}
    </>
  );

  return (
    <div
      ref={graphPaperRef}
className={`graph-paper flex-grow-1 ${paperMode ? 'paper-mode-backdrop' : 'infinite-canvas-bg'} ${!paperMode && showGrid ? 'grid-bg' : ''} ${marquee ? 'is-selecting' : ''}`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {paperMode ? (
        <div className="d-flex justify-content-center" style={{ minWidth: `${a4.width * zoom + 80}px`, minHeight: `${a4.height * pageCount * zoom + 80}px`, padding: '40px' }}>
          <div ref={canvasRef} className={`canvas-area a4-paper shadow ${showGrid ? 'grid-bg' : ''}`} style={{ transform: `scale(${zoom})`, width: `${a4.width}px`, height: `${a4.height * pageCount}px`, flexShrink: 0 }}>
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
