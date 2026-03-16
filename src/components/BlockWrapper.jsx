import React, { useState, useRef } from 'react';
import { Rnd } from 'react-rnd';
import { useWorkspace } from '../WorkspaceContext';
import MathBlock from './MathBlock';
import TextBlock from './TextBlock';
import SectionBlock from './SectionBlock';

const GRID_SIZE = 20;

export default function BlockWrapper({ block }) {
  const { results, selectedIds, activeDrag, actions } = useWorkspace();
  const [isFocused, setIsFocused] = useState(false);
  const wasDragged = useRef(false);

  const hasError = !!results[block.id]?.error;
  const isSelected = selectedIds.includes(block.id);

  // If another block in our selection group is currently being dragged,
  // we visually offset THIS block by the active drag delta.
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
        wasDragged.current = false;
        // If they start dragging a block that isn't selected yet, select it
        if (!isSelected) {
          actions.select(e.shiftKey ? [...selectedIds, block.id] : [block.id]);
        }
      }}
      onDrag={(e, d) => {
        wasDragged.current = true;
        actions.drag(block.id, d.x - block.x, d.y - block.y);
      }}
      onDragStop={(e, d) => {
        const dx = Math.round((d.x - block.x) / GRID_SIZE) * GRID_SIZE;
        const dy = Math.round((d.y - block.y) / GRID_SIZE) * GRID_SIZE;
        actions.dragStop(block.id, dx, dy);

        // Prevent onClick from immediately clearing the selection after dropping
        setTimeout(() => { wasDragged.current = false; }, 50);
      }}
      enableResizing={false}
      dragGrid={[GRID_SIZE, GRID_SIZE]}
      cancel="input, textarea, math-field, .math-result-unit--clickable"
      style={{ position: 'absolute', zIndex: isFocused || isSelected ? 20 : 10 }}
    >
      <div
        id={`block-container-${block.id}`}
        className="block-container position-relative d-flex align-items-start"
        onClick={(e) => {
          e.stopPropagation();
          // If we just dropped it from a drag, don't trigger a click
          if (wasDragged.current) return;

          if (e.shiftKey) {
            actions.select(isSelected ? selectedIds.filter(id => id !== block.id) : [...selectedIds, block.id]);
          } else {
            actions.select([block.id]);
          }
        }}
        style={{ cursor: isFocused ? 'default' : 'grab' }}
      >
        <div className={wrapperClass}>
          {block.type === 'math' && <MathBlock id={block.id} initialValue={block.expression} setFocus={handleFocus} />}
          {block.type === 'text' && <TextBlock id={block.id} initialValue={block.expression} setFocus={handleFocus} />}
          {block.type === 'section' && <SectionBlock id={block.id} initialValue={block.expression} setFocus={handleFocus} />}
        </div>
      </div>
    </Rnd>
  );
}
