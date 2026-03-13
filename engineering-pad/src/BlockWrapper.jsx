import React, { useState } from 'react';
import { Rnd } from 'react-rnd';
import MathBlock from './MathBlock';
import TextBlock from './TextBlock';
import SectionBlock from './SectionBlock';

const GRID_SIZE = 20;

export default function BlockWrapper({
  block,
  numStr, unitStr, hasError, errorLabel, errorMsg,
  hasUnitResult, unitIsOverridden,
  isSelected,
  activeMathFieldRef,
  onSelect, onMove, onDelete, onChange, onEnter, onNudge, onTransform,
  onUnitChange, onUnitReset,
}) {
  const [isFocused, setIsFocused] = useState(false);

  const handleFocus = (v) => {
    setIsFocused(v);
    if (v) onSelect?.(block.id);
  };

  const wrapperClass = [
    'math-wrapper',
    isFocused  && 'focused',
    isSelected && !isFocused && 'selected',
    hasError   && !isFocused && 'has-error',
  ].filter(Boolean).join(' ');

  return (
    <Rnd
      position={{ x: block.x, y: block.y }}
      onDragStop={(e, d) => onMove(block.id, d.x, d.y)}
      bounds="parent"
      enableResizing={false}
      dragGrid={[GRID_SIZE, GRID_SIZE]}
      dragHandleClassName="drag-handle"
      style={{ position: 'absolute', zIndex: isFocused ? 20 : isSelected ? 15 : 10 }}
    >
      <div className={`block-container block-type-${block.type}`}>
        <div className="drag-handle" title="Drag to move">
          <div className="drag-handle-dots">
            <span /><span /><span /><span /><span /><span />
          </div>
        </div>

        <div className={wrapperClass}>
          {/* Type badge — shown while focused */}
          <span className="block-type-badge">
            {block.type === 'math' ? 'math' : block.type === 'section' ? 'heading' : 'text'}
          </span>

          {block.type === 'math' && (
            <MathBlock
              id={block.id}
              initialValue={block.expression}
              numStr={numStr}
              unitStr={unitStr}
              hasError={hasError}
              errorLabel={errorLabel}
              errorMsg={errorMsg}
              hasUnitResult={hasUnitResult}
              unitIsOverridden={unitIsOverridden}
              activeMathFieldRef={activeMathFieldRef}
              setFocus={handleFocus}
              onDelete={onDelete}
              onChange={onChange}
              onEnter={onEnter}
              onNudge={onNudge}
              onTransform={onTransform}
              onUnitChange={onUnitChange}
              onUnitReset={onUnitReset}
            />
          )}

          {block.type === 'text' && (
            <TextBlock
              id={block.id}
              initialValue={block.expression}
              setFocus={handleFocus}
              onDelete={onDelete}
              onChange={onChange}
              onEnter={onEnter}
              onNudge={onNudge}
            />
          )}

          {block.type === 'section' && (
            <SectionBlock
              id={block.id}
              initialValue={block.expression}
              setFocus={handleFocus}
              onDelete={onDelete}
              onChange={onChange}
              onEnter={onEnter}
              onNudge={onNudge}
            />
          )}
        </div>

        <button
          className="block-delete-btn"
          title="Delete block"
          onMouseDown={e => { e.stopPropagation(); onDelete(block.id); }}
        >×</button>
      </div>
    </Rnd>
  );
}
