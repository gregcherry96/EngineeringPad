import React, { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import 'mathlive';

const MathFieldWrapper = forwardRef(({ value, onInput, onFocusIn, onFocusOut, onKeyDown, style }, ref) => {
  const mathFieldRef = useRef(null);

  // Expose the underlying web component instance to the parent ref
  useImperativeHandle(ref, () => mathFieldRef.current);

  // Store callbacks in a ref to prevent re-attaching event listeners on every render
  const callbacksRef = useRef({ onInput, onFocusIn, onFocusOut, onKeyDown });
  useEffect(() => {
    callbacksRef.current = { onInput, onFocusIn, onFocusOut, onKeyDown };
  });

  useEffect(() => {
    const mf = mathFieldRef.current;
    if (!mf) return;

    if (value && !mf.getValue()) {
      mf.setValue(value);
      setTimeout(() => mf.focus(), 50);
    }

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
  }, [value]); // Bind DOM listeners once, callbacks are kept fresh via refs

  return <math-field ref={mathFieldRef} style={style} />;
});

export default MathFieldWrapper;
