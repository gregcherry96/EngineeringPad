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

  // Effect 1: Handle setting the initial value when the component mounts/updates
  useEffect(() => {
    const mf = mathFieldRef.current;
    if (mf && value && !mf.getValue()) {
      mf.setValue(value);
      setTimeout(() => mf.focus(), 50);
    }
  }, [value]);

  // Effect 2: Attach DOM event listeners strictly ONCE
  // Step 1: Empty dependency array guarantees no wasteful unmount/remount cycles
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
