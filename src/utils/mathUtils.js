const SUP = {
  '-': '⁻', '0': '⁰', '1': '¹', '2': '²', '3': '³',
  '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹'
};

const toSup = (n) => String(n).split('').map(c => SUP[c] ?? c).join('');

export function convertResult(rawResult, targetUnit) {
  if (!rawResult?.isUnit) throw new Error('Not a unit quantity');
  const val = rawResult.to(targetUnit).toNumber(targetUnit);
  return { numStr: formatNum(val), unitStr: targetUnit === 'ohm' ? 'Ω' : targetUnit };
}

export function formatNum(n) {
  // Step 4: Ensure proper handling of NaN explicitly
  if (Number.isNaN(n)) return 'NaN';
  if (n === null || n === undefined || !isFinite(n)) return String(n);

  const abs = Math.abs(n);
  if (abs !== 0 && (abs >= 1e7 || abs < 1e-4)) {
    const [coeff, exp] = n.toExponential(4).replace(/\.?0+e/, 'e').split('e');
    return `${coeff} × 10${toSup(exp.replace('+', ''))}`;
  }
  return String(parseFloat(n.toPrecision(7)));
}

export function buildUnitStr(unitObj) {
  // Step 4: Handle cases where unitObj.units might be undefined cleanly before iterating
  if (!unitObj?.units || !Array.isArray(unitObj.units) || unitObj.units.length === 0) return '';

  const pos = [], neg = [];
  for (const t of unitObj.units) {
    const token = (t.prefix?.name ?? '') + (t.unit?.name ?? '');
    const p = t.power ?? 1;
    if (p === 0) continue;
    const sup = Math.abs(p) === 1 ? '' : toSup(Math.abs(p));
    (p > 0 ? pos : neg).push(token + sup);
  }
  if (!pos.length && !neg.length) return '';
  if (!neg.length) return pos.join(' ');
  if (!pos.length) return '/ ' + neg.join(' ');
  return pos.join(' ') + ' / ' + neg.join(' ');
}

const DIM_TO_UNIT = {
  '0,0,-1,0,0,0,0,0,0':   'Hz',
  '1,1,-2,0,0,0,0,0,0':   'N',
  '-1,1,-2,0,0,0,0,0,0':  'Pa',
  '2,1,-2,0,0,0,0,0,0':   'J',
  '2,1,-3,0,0,0,0,0,0':   'W',
  '0,0,1,1,0,0,0,0,0':    'C',
  '2,1,-3,-1,0,0,0,0,0':  'V',
  '-2,-1,4,2,0,0,0,0,0':  'F',
  '2,1,-3,-2,0,0,0,0,0':  'ohm',
  '-2,-1,3,2,0,0,0,0,0':  'S',
  '2,1,-2,-1,0,0,0,0,0':  'Wb',
  '0,1,-2,-1,0,0,0,0,0':  'T',
  '2,1,-2,-2,0,0,0,0,0':  'H',
  '2,0,-2,0,0,0,0,0,0':   'Gy',
  '0,0,-2,0,0,0,0,0,0':   'Bq',
};

export function simplifyAndFormat(unitObj) {
  if (!unitObj?.isUnit) return null;
  const key   = (unitObj.dimensions ?? []).slice(0, 9).join(',');
  const named = DIM_TO_UNIT[key];
  if (named) {
    try {
      const val = unitObj.to(named).toNumber(named);
      return { numStr: formatNum(val), unitStr: named === 'ohm' ? 'Ω' : named };
    } catch { /* fall through */ }
  }
  try {
    const parts = unitObj.units.filter(t => (t.power ?? 1) !== 0).map(t => {
      const tok = (t.prefix?.name ?? '') + (t.unit?.name ?? '');
      const p = t.power ?? 1;
      return p === 1 ? tok : `(${tok})^${p}`;
    });
    const val = unitObj.toNumber(parts.join(' '));
    return { numStr: formatNum(val), unitStr: buildUnitStr(unitObj) };
  } catch {
    return { numStr: formatNum(unitObj.value ?? 0), unitStr: buildUnitStr(unitObj) };
  }
}

export function formatMathResult(result) {
  if (result == null || typeof result === 'function') return null;
  if (result?.isUnit)    return simplifyAndFormat(result);
  if (result?.isMatrix)  return { numStr: result.toString(), unitStr: '' };
  if (Array.isArray(result)) return { numStr: JSON.stringify(result), unitStr: '' };
  if (typeof result === 'boolean') return { numStr: String(result), unitStr: '' };
  if (result?.isComplex) {
    const re = formatNum(result.re), im = formatNum(Math.abs(result.im));
    return { numStr: `${re} ${result.im >= 0 ? '+' : '−'} ${im}i`, unitStr: '' };
  }
  if (typeof result === 'number') return { numStr: formatNum(result), unitStr: '' };
  return { numStr: String(result), unitStr: '' };
}

export function classifyError(err) {
  const msg = err?.message ?? String(err);
  if (/undefined symbol|is not defined/i.test(msg))     return { label: 'undefined', msg };
  if (/Units do not match|incompatible unit/i.test(msg)) return { label: 'unit mismatch', msg };
  if (/Unexpected token|parse error/i.test(msg))        return { label: 'syntax', msg };
  if (/Cannot convert|no unit/i.test(msg))              return { label: 'unit error', msg };
  if (/division by zero|Cannot divide/i.test(msg))      return { label: 'div / 0', msg };
  return { label: 'error', msg };
}
