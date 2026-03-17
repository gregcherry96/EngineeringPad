import React, { useState, useRef, useEffect } from 'react';
import { useWorkspaceData, useWorkspaceInteraction, useWorkspaceActionData } from '../WorkspaceContext';
import BlockWrapper from './BlockWrapper';
import { GRID_SIZE, PAPER_SIZES, BLOCK_ESTIMATED_WIDTH, BLOCK_ESTIMATED_HEIGHT, CANVAS_PADDING, DOM_CLASSES } from '../utils/canvasConfig';
import { calculateWorldCoordinates, calculateMarqueeBounds, getIntersectingBlocks } from '../utils/canvasUtils';

export default function CanvasArea({
  zoom, startPan, pan, stopPan, isPanning, spaceHeld, graphPaperRef,
  showGrid, paperMode, pageCount
}) {
  const { blocks, results } = useWorkspaceData();
  const { selectedIds, cursorPos } = useWorkspaceInteraction();
  const { actions, updateBlocks } = useWorkspaceActionData();

  const [marquee, setMarquee] = useState(null);
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const mousePosRef = useRef(null);

  const canvasToWorld = (clientX, clientY) => {
    return calculateWorldCoordinates(clientX, clientY, canvasRef.current?.getBoundingClientRect(), zoom, GRID_SIZE);
  };

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const handleMouseDown = (e) => {
    if (e.button === 1 || spaceHeld.current) { startPan(e); return; }

    if (
      e.target.closest(`.${DOM_CLASSES.BLOCK_CONTAINER}`) ||
      e.target.closest(`.${DOM_CLASSES.SIDEBAR}`) ||
      e.target.closest(`.${DOM_CLASSES.NAVBAR}`)
    ) return;

    if (paperMode && !e.target.closest(`.${DOM_CLASSES.CANVAS}`)) return;

    const { x, y } = canvasToWorld(e.clientX, e.clientY);

    setMarquee({ startX: x, startY: y, endX: x, endY: y, initialSelection: e.shiftKey ? selectedIds : [] });

    if (!e.shiftKey) {
      actions.select([]);
    }
    actions.setCursorPos(null);
  };

  const handleMouseMove = (e) => {
    if (isPanning.current) { pan(e); return; }
    if (marquee) {
      mousePosRef.current = { clientX: e.clientX, clientY: e.clientY };

      if (!rafRef.current) {
        rafRef.current = requestAnimationFrame(() => {
          if (!mousePosRef.current) return;

          const { x, y } = canvasToWorld(mousePosRef.current.clientX, mousePosRef.current.clientY);
          setMarquee(prev => ({ ...prev, endX: x, endY: y }));

          const currentMarquee = { ...marquee, endX: x, endY: y };
          const bounds = calculateMarqueeBounds(currentMarquee);

          const newlySelectedBlocks = getIntersectingBlocks(blocks, bounds, BLOCK_ESTIMATED_WIDTH, BLOCK_ESTIMATED_HEIGHT);
          const newlySelected = newlySelectedBlocks.map(b => b.id);

          actions.select([...new Set([...marquee.initialSelection, ...newlySelected])]);

          rafRef.current = null;
        });
      }
    }
  };

  const handleMouseUp = (e) => {
    if (isPanning.current) stopPan();
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    if (marquee) {
      const bounds = calculateMarqueeBounds(marquee);

      if (bounds.dx < 5 && bounds.dy < 5) {
        const { x, y } = canvasToWorld(e.clientX, e.clientY);
        actions.setCursorPos({ x, y });
        const hasEmpty = blocks.some(b => !b.expression.trim());
        if (hasEmpty) updateBlocks(p => p.filter(b => b.expression.trim()), true);
      }
      setMarquee(null);
      mousePosRef.current = null;
    }
  };

  // Step 3: Determine the correct cursor class
  const getInteractionCursor = () => {
    if (isPanning.current) return 'cursor-grabbing';
    if (spaceHeld.current) return 'cursor-grab';
    return 'cursor-crosshair';
  };

  const maxW = Math.max(2000, ...blocks.map(b => b.x + CANVAS_PADDING), cursorPos ? cursorPos.x + CANVAS_PADDING : 0);
  const maxH = Math.max(2000, ...blocks.map(b => b.y + CANVAS_PADDING), cursorPos ? cursorPos.y + CANVAS_PADDING : 0);

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

      {blocks.length === 0 && !cursorPos && (
        <div
          // Step 4: Applied the 'empty-state-animated' class to make the helper text pulse gently
          className="empty-state-animated position-absolute top-50 start-50 translate-middle text-muted user-select-none text-center"
          style={{ pointerEvents: 'none', width: '300px' }}
        >
          <h4 className="mb-2">Canvas is empty</h4>
          <p className="mb-0">Click anywhere to start typing math.</p>
          <p className="small mt-2 opacity-75">Hold Spacebar to pan.</p>
        </div>
      )}

      {blocks.map(block => <BlockWrapper key={block.id} block={block} res={results?.[block.id] ?? {}} />)}
    </>
  );

  return (
    <div
      ref={graphPaperRef}
      // Step 3: Injected `getInteractionCursor()` to apply the correct interaction mouse state
      className={`graph-paper flex-grow-1 ${getInteractionCursor()} ${paperMode ? 'paper-mode-backdrop' : 'infinite-canvas-bg'} ${!paperMode && showGrid ? 'grid-bg' : ''} ${marquee ? 'is-selecting' : ''}`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {paperMode ? (
        <div className="d-flex justify-content-center" style={{ minWidth: `${a4.width * zoom + 80}px`, minHeight: `${a4.height * pageCount * zoom + 80}px`, padding: '40px' }}>
          <div
            ref={canvasRef}
            className={`canvas-area a4-paper shadow ${showGrid ? 'grid-bg' : ''}`}
            style={{
              transform: `scale(${zoom})`,
              width: `${a4.width}px`,
              height: `${a4.height * pageCount}px`,
              flexShrink: 0,
              backgroundImage: pageCount > 1 ? `linear-gradient(to bottom, transparent calc(100% - 1px), #ccc calc(100% - 1px))` : 'none',
              backgroundSize: `100% ${a4.height}px`
            }}
          >
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
