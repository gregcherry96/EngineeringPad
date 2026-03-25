import * as math from 'mathjs';
import { MATH_SCOPE } from '../utils/mathConstants';
import { formatMathResult, classifyError, convertResult } from '../utils/mathUtils';
import { GRID_SIZE } from '../utils/canvasConfig';

const baseKeys = new Set(Object.keys(MATH_SCOPE));
const compiledCache = new Map();

self.onmessage = function(e) {
  const { blocks, unitOverrides } = e.data;

  const sortedBlocks = [...blocks].sort((a, b) =>
    Math.abs(a.y - b.y) < GRID_SIZE ? a.x - b.x : a.y - b.y
  );

  const scope = { ...MATH_SCOPE };
  const newResults = {}, newRaw = {}, newVars = {};

  for (const block of sortedBlocks) {
    if (block.type !== 'math' || !block.expression.trim()) continue;
    try {
      // Check cache for compiled expression
      let compiled = compiledCache.get(block.expression);
      if (!compiled) {
        compiled = math.compile(block.expression);
        compiledCache.set(block.expression, compiled);
      }

      const result = compiled.evaluate(scope);
      const formatted = formatMathResult(result);

      newResults[block.id] = formatted
        ? { ...formatted, error: false }
        : { numStr: '', unitStr: '', error: false };

      if (result?.isUnit) {
        newRaw[block.id] = {
          value: result.value,
          unit: typeof result.formatUnits === 'function' ? result.formatUnits() : result.toString()
        };
      }

      const ov = unitOverrides?.[block.id];
      if (ov && result?.isUnit) {
        try {
          newResults[block.id] = { ...convertResult(result, ov), error: false };
        } catch {
          newResults[block.id].error = true;
          newResults[block.id].errorLabel = 'unit error';
        }
      }

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

  self.postMessage({ results: newResults, userVars: newVars, rawResults: newRaw });
};
