import React, { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { MathfieldElement } from 'mathlive';

MathfieldElement.fontsDirectory = 'https://cdn.jsdelivr.net/npm/mathlive@0.109.0/dist/fonts';
MathfieldElement.soundsDirectory = 'https://cdn.jsdelivr.net/npm/mathlive@0.109.0/dist/sounds';

const MathFieldWrapper = forwardRef(({ value, latex, onInput, onFocusIn, onFocusOut, onKeyDown, style }, ref) => {
  const mathFieldRef = useRef(null);

  useImperativeHandle(ref, () => mathFieldRef.current);

  const callbacksRef = useRef({ onInput, onFocusIn, onFocusOut, onKeyDown });
  useEffect(() => {
    callbacksRef.current = { onInput, onFocusIn, onFocusOut, onKeyDown };
  });

  // Step 1: Load native LaTeX if we have it, fallback to ascii-math
  useEffect(() => {
    const mf = mathFieldRef.current;
    if (mf && !mf.getValue()) {
      if (latex) {
        mf.value = latex;
        setTimeout(() => mf.focus(), 50);
      } else if (value) {
        mf.setValue(value, { format: 'ascii-math' });
        setTimeout(() => mf.focus(), 50);
      }
    }
  }, [value, latex]);

  useEffect(() => {
    const mf = mathFieldRef.current;
    if (!mf) return;

    const handleInput = (e) => callbacksRef.current.onInput?.(e, mf);
    const handleFocusIn = (e) => callbacksRef.current.onFocusIn?.(e, mf);
    const handleFocusOut = (e) => callbacksRef.current.onFocusOut?.(e, mf);
    const handleKeyDown = (e) => callbacksRef.current.onKeyDown?.(e, mf);

    mf.addEventListener('input', handleInput);
    mf.addEventListener('focusin', handleFocusIn);
    mf.addEventListener('focusout', handleFocusOut);
    mf.addEventListener('keydown', handleKeyDown);

    return () => {
      mf.removeEventListener('input', handleInput);
      mf.removeEventListener('focusin', handleFocusIn);
      mf.removeEventListener('focusout', handleFocusOut);
      mf.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return <math-field ref={mathFieldRef} style={style} />;
});

export default MathFieldWrapper;
