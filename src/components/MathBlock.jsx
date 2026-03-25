import React, { useEffect, useRef, useState, memo } from 'react';
import { sanitizeMath } from '../utils/mathSanitize';
import { useWorkspaceData, useWorkspaceInteraction, useWorkspaceActionData } from '../WorkspaceContext';
import MathFieldWrapper from './MathFieldWrapper';
import MathResult from './MathResult';
import { useBlockShortcuts } from '../hooks/index.js';

function MathBlock({ id, initialValue, initialLatex, setFocus }) {
  const { results } = useWorkspaceData();
  const { activeMathFieldRef } = useWorkspaceInteraction();
  const { actions } = useWorkspaceActionData();

  const [isStale, setIsStale] = useState(false);
  const mathFieldRef = useRef(null);

  const { handleKeyDown, isTransforming } = useBlockShortcuts(id, actions);

  const res = results?.[id] ?? {};
  const resRef = useRef(res);

  useEffect(() => {
    resRef.current = res;
    setIsStale(false);
  }, [res]);

  const handleInput = (e, mf) => {
    setIsStale(true);
    actions.changeMath(id, sanitizeMath(mf.getValue('ascii-math')), mf.value);
  };

  const handleFocusIn = (e, mf) => {
    setFocus(true);
    if (activeMathFieldRef) activeMathFieldRef.current = mf;
  };

  const handleFocusOut = (e, mf) => {
    setFocus(false);
    if (!mf.getValue() && !isTransforming.current) actions.delete(id);
  };

  const isEmpty = !initialValue;

  return (
    <>
      <MathFieldWrapper
        ref={mathFieldRef}
        style={{
          minWidth: '60px',
          backgroundColor: isEmpty ? '#f8f9fa' : 'transparent',
          border: isEmpty ? '1px dashed #dee2e6' : '1px solid transparent',
          borderRadius: '4px',
          padding: isEmpty ? '2px' : '0'
        }}
        value={initialValue}
        latex={initialLatex}
        onInput={handleInput}
        onFocusIn={handleFocusIn}
        onFocusOut={handleFocusOut}
        onKeyDown={handleKeyDown}
      />
      <MathResult id={id} res={res} isStale={isStale} />
    </>
  );
}

const areEqual = (prevProps, nextProps) => {
  return prevProps.id === nextProps.id &&
         prevProps.initialValue === nextProps.initialValue &&
         prevProps.initialLatex === nextProps.initialLatex;
};

export default memo(MathBlock, areEqual);
