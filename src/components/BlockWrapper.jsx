import React, { useState, useRef, memo } from 'react';
import { Rnd } from 'react-rnd';
import { useWorkspaceInteraction, useWorkspaceActionData } from '../WorkspaceContext';
import MathBlock from './MathBlock';
import TextBlock from './TextBlock';
import SectionBlock from './SectionBlock';

const GRID_SIZE = 20;

function BlockWrapper({ block, res }) {
  // Use isolated contexts so this only re-renders when relevant interactions/refs change.
  const { selectedIds, activeDrag } = useWorkspaceInteraction();
  const { actions } = useWorkspaceActionData();
  const [isFocused, setIsFocused] = useState(false);

  const mouseDownPos = useRef({ x: 0, y: 0 });

  const hasError = !!res?.error;
  const isSelected = selectedIds.includes(block.id);

  const isPeerDragged = isSelected && activeDrag && activeDrag.id !== block.id;
  const displayX = block.x + (isPeerDragged ? activeDrag.dx : 0);
  const displayY = block.y + (isPeerDragged ? activeDrag.dy : 0);

  const handleFocus = (v) => {
    setIsFocused(v);
    if (v && !isSelected) actions.select([block.id]);
  };

  const wrapperClass = [
    'math-wrapper rounded px-2 py-1 d-flex align-items-center gap-2 border',
    isFocused ? 'focused bg-white border-primary' : (isSelected ? 'border-secondary bg-white bg-opacity-75 shadow-sm' : 'border-transparent bg-transparent'),
    hasError && !isFocused && 'has-error bg-danger bg-opacity-10 border-danger'
  ].filter(Boolean).join(' ');

  return (
    <Rnd
      position={{ x: displayX, y: displayY }}
      onDragStart={(e) => {
        if (!isSelected) {
          actions.select(e.shiftKey ? [...selectedIds, block.id] : [block.id]);
        }
      }}
      onDrag={(e, d) => {
        actions.drag(block.id, d.x - block.x, d.y - block.y);
      }}
      onDragStop={(e, d) => {
        const dx = Math.round((d.x - block.x) / GRID_SIZE) * GRID_SIZE;
        const dy = Math.round((d.y - block.y) / GRID_SIZE) * GRID_SIZE;
        actions.dragStop(block.id, dx, dy);
      }}
      enableResizing={false}
      dragGrid={[GRID_SIZE, GRID_SIZE]}
      cancel="input, textarea, math-field, .math-result-unit--clickable"
      style={{ position: 'absolute', zIndex: isFocused || isSelected ? 20 : 10 }}
    >
      <div
        id={`block-container-${block.id}`}
        className="block-container position-relative d-flex align-items-start"
        onMouseDown={(e) => {
          mouseDownPos.current = { x: e.clientX, y: e.clientY };
        }}
        onClick={(e) => {
          e.stopPropagation();

          const dx = Math.abs(e.clientX - mouseDownPos.current.x);
          const dy = Math.abs(e.clientY - mouseDownPos.current.y);
          if (dx > 5 || dy > 5) return;

          if (e.shiftKey) {
            actions.select(isSelected ? selectedIds.filter(id => id !== block.id) : [...selectedIds, block.id]);
          } else {
            actions.select([block.id]);
          }
        }}
        style={{ cursor: isFocused ? 'default' : 'grab' }}
      >
        <div className={wrapperClass}>
          {block.type === 'math' && <MathBlock id={block.id} initialValue={block.expression} setFocus={handleFocus} res={res} />}
          {block.type === 'text' && <TextBlock id={block.id} initialValue={block.expression} setFocus={handleFocus} res={res} />}
          {block.type === 'section' && <SectionBlock id={block.id} initialValue={block.expression} setFocus={handleFocus} res={res} />}
        </div>
      </div>
    </Rnd>
  );
}

// Memoized Wrapper
const wrapperAreEqual = (prev, next) => {
  return prev.block === next.block && prev.res === next.res;
};

export default memo(BlockWrapper, wrapperAreEqual);
