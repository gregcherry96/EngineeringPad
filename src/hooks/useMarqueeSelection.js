import { useState, useRef, useEffect } from 'react';
import { calculateWorldCoordinates, calculateMarqueeBounds, getIntersectingBlocks } from '../utils/canvasUtils';
import { GRID_SIZE, BLOCK_ESTIMATED_WIDTH, BLOCK_ESTIMATED_HEIGHT, DOM_CLASSES } from '../utils/canvasConfig';

export function useMarqueeSelection({
  canvasRef, zoom, blocks, selectedIds, actions, isPanning, spaceHeld, paperMode, updateBlocks
}) {
  const [marquee, setMarquee] = useState(null);
  const rafRef = useRef(null);
  const mousePosRef = useRef(null);

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const canvasToWorld = (clientX, clientY) => {
    return calculateWorldCoordinates(clientX, clientY, canvasRef.current?.getBoundingClientRect(), zoom, GRID_SIZE);
  };

  const handleMouseDown = (e) => {
    if (e.button === 1 || spaceHeld.current) return;

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
    if (isPanning.current) return;
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

  return { marquee, handleMouseDown, handleMouseMove, handleMouseUp };
}
