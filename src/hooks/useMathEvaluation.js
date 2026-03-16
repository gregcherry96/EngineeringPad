import { useState, useRef, useCallback, useEffect } from 'react';
import * as math from 'mathjs';
import { MATH_SCOPE } from '../utils/mathConstants';
import { formatMathResult, classifyError, convertResult } from '../utils/mathUtils';

const GRID_SIZE = 20;

export function useMathEvaluation(blocks, unitOverrides, setUnitOverrides) {
  const [results, setResults] = useState({});
  const [userVars, setUserVars] = useState({});
  const rawResultsRef = useRef({});

  const evaluateAllImmediate = useCallback((currentBlocks, currentOverrides) => {
    // Sort blocks visually top-to-bottom, left-to-right
    const sortedBlocks = [...currentBlocks].sort((a, b) => Math.abs(a.y - b.y) < GRID_SIZE ? a.x - b.x : a.y - b.y);
    const scope = { ...MATH_SCOPE };
    const newResults = {}, newRaw = {}, newVars = {};
    const baseKeys = new Set(Object.keys(MATH_SCOPE));

    for (const block of sortedBlocks) {
      if (block.type !== 'math' || !block.expression.trim()) continue;
      try {
        const result = math.evaluate(block.expression, scope);
        const formatted = formatMathResult(result);
        newResults[block.id] = formatted ? { ...formatted, error: false } : { numStr: '', unitStr: '', error: false };
        if (result?.isUnit) newRaw[block.id] = result;

        // Apply unit overrides if present
        const ov = currentOverrides?.[block.id];
        if (ov && result?.isUnit) {
          try {
            newResults[block.id] = { ...convertResult(result, ov), error: false };
          } catch {
            setUnitOverrides(p => { const n = { ...p }; delete n[block.id]; return n; });
          }
        }

        // Extract newly defined variables from the scope
        for (const key of Object.keys(scope)) {
          if (!baseKeys.has(key) && typeof scope[key] !== 'function') {
            const fmt = formatMathResult(scope[key]);
            if (fmt) newVars[key] = fmt.unitStr ? `${fmt.numStr} ${fmt.unitStr}` : fmt.numStr;
          }
        }
      } catch (err) {
        const { label, msg } = classifyError(err);
        newResults[block.id] = { numStr: '', unitStr: '', error: true, errorLabel: label, errorMsg: msg };
      }
    }
    rawResultsRef.current = newRaw;
    setResults(newResults);
    setUserVars(newVars);
  }, [setUnitOverrides]);

  useEffect(() => {
    // Debounce the math evaluation by 150ms to prevent UI freezing on fast typing
    const timerId = setTimeout(() => {
      evaluateAllImmediate(blocks, unitOverrides);
    }, 150);

    return () => clearTimeout(timerId);
  }, [blocks, unitOverrides, evaluateAllImmediate]);

  return { results, userVars, rawResultsRef };
}
