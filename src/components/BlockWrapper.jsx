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
  isSelected, isDependency,
  activeMathFieldRef,
  onSelect, onMove, onDelete, onChange, onEnter, onNudge, onTransform,
  onUnitChange, onUnitReset, onLeaveBlock
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
    isDependency && !isFocused && 'is-dependency'
  ].filter(Boolean).join(' ');

  return (
    <Rnd
      position={{ x: block.x, y: block.y }}
      onDragStop={(e, d) => onMove(block.id, d.x, d.y)}
      enableResizing={false}
      dragGrid={[GRID_SIZE, GRID_SIZE]}
      dragHandleClassName="drag-handle-new"
      style={{ position: 'absolute', zIndex: isFocused ? 20 : isSelected ? 15 : 10 }}
    >
      <div id={`block-container-${block.id}`} className={`block-container block-type-${block.type}`}>

        <div className="block-actions-menu">
          <div className="drag-handle-new" title="Drag to move block">
            ⠿ 
          </div>
          <button
            className="action-icon-btn"
            title={`Current: ${block.type}. Click to change.`}
            onClick={() => onTransform(block.id, block.type === 'math' ? 'text' : 'math')}
          >
            {block.type === 'math' ? '𝑓' : 'T'}
          </button>
          <button
            className="action-icon-btn delete-btn"
            title="Delete block"
            onMouseDown={e => { e.stopPropagation(); onDelete(block.id); }}
          >
            ✕
          </button>
        </div>

        <div className={wrapperClass}>
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
              onLeaveBlock={onLeaveBlock}
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
              onLeaveBlock={onLeaveBlock}
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
              onLeaveBlock={onLeaveBlock}
            />
          )}
        </div>
      </div>
    </Rnd>
  );
}