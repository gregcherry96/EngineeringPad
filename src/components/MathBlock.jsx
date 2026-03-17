import React, { useEffect, useRef, useState, memo } from 'react';
import { sanitizeMath } from '../utils/mathSanitize';
import { useWorkspaceInteraction, useWorkspaceActionData } from '../WorkspaceContext';
import MathFieldWrapper from './MathFieldWrapper';
import MathResult from './MathResult';
import { useBlockShortcuts } from '../hooks/index.js';

function MathBlock({ id, initialValue, setFocus, res }) {
  const { activeMathFieldRef } = useWorkspaceInteraction();
  const { actions } = useWorkspaceActionData();
  const [isStale, setIsStale] = useState(false);
  const mathFieldRef = useRef(null);

  const { handleKeyDown, isTransforming } = useBlockShortcuts(id, actions);

  const resRef = useRef(res);
  useEffect(() => {
    resRef.current = res;
    setIsStale(false);
  }, [res]);

  const handleInput = (e, mf) => {
    setIsStale(true);
    actions.change(id, sanitizeMath(mf.getValue('ascii-math')));
  };

  const handleFocusIn = (e, mf) => {
    setFocus(true);
    if (activeMathFieldRef) activeMathFieldRef.current = mf;
  };

  const handleFocusOut = (e, mf) => {
    setFocus(false);
    if (!mf.getValue() && !isTransforming.current) actions.delete(id);
  };

  return (
    <>
      <MathFieldWrapper
        ref={mathFieldRef}
        style={{ minWidth: '30px' }}
        value={initialValue}
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
         prevProps.res === nextProps.res;
};

export default memo(MathBlock, areEqual);
