import React, { useRef } from 'react';
import { useWorkspaceData, useWorkspaceInteraction, useWorkspaceActionData } from '../WorkspaceContext';
import BlockWrapper from './BlockWrapper';
import { GRID_SIZE, PAPER_SIZES, CANVAS_PADDING } from '../utils/canvasConfig';
import { calculateMarqueeBounds } from '../utils/canvasUtils';
import { useMarqueeSelection } from '../hooks/useMarqueeSelection';

export default function CanvasArea({
  zoom, startPan, pan, stopPan, isPanning, spaceHeld, graphPaperRef,
  showGrid, paperMode, pageCount
}) {
  const { blocks, results } = useWorkspaceData();
  const { selectedIds, cursorPos } = useWorkspaceInteraction();
  const { actions, updateBlocks } = useWorkspaceActionData();

  const canvasRef = useRef(null);

  const { marquee, handleMouseDown, handleMouseMove, handleMouseUp } = useMarqueeSelection({
    canvasRef, zoom, blocks, selectedIds, actions, isPanning, spaceHeld, paperMode, updateBlocks
  });

  const onMouseDown = (e) => {
    if (e.button === 1 || spaceHeld.current) { startPan(e); return; }
    handleMouseDown(e);
  };

  const onMouseMove = (e) => {
    if (isPanning.current) { pan(e); return; }
    handleMouseMove(e);
  };

  const onMouseUp = (e) => {
    if (isPanning.current) stopPan();
    handleMouseUp(e);
  };

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

      {/* Step 4: Enhanced empty state rendering */}
      {blocks.length === 0 && !cursorPos && (
        <div
          className="empty-state-animated position-absolute top-50 start-50 translate-middle text-muted text-center"
          style={{ width: '300px' }}
        >
          <h4 className="mb-2">Canvas is empty</h4>
          <p className="mb-3">Click anywhere to start typing math.</p>
          <button
            className="btn btn-primary empty-state-btn"
            onClick={() => actions.setCursorPos({ x: 100, y: 100 })}
            aria-label="Create new math block"
          >
            Add Math Block
          </button>
          <p className="small mt-3 opacity-75">Hold Spacebar to pan.</p>
        </div>
      )}

      {blocks.map(block => <BlockWrapper key={block.id} block={block} res={results?.[block.id] ?? {}} />)}
    </>
  );

  return (
    <div
      ref={graphPaperRef}
      className={`graph-paper flex-grow-1 ${getInteractionCursor()} ${paperMode ? 'paper-mode-backdrop' : 'infinite-canvas-bg'} ${!paperMode && showGrid ? 'grid-bg' : ''} ${marquee ? 'is-selecting' : ''}`}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
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
