import React from 'react';
import UnitEditor from './UnitEditor';

export default function MathResult({ id, res, isStale }) {
  const copyToClipboard = (e) => {
    e.stopPropagation();
    const raw = res.numStr
      .replace(/\s×\s10/g, 'e')
      .replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹⁻]/g, c => '⁰¹²³⁴⁵⁶⁷⁸⁹⁻'.indexOf(c).toString().replace('10',''));
    navigator.clipboard?.writeText(raw);
  };

  if (res.error) {
    return (
      <span
        className={`badge bg-danger ms-2 transition-opacity duration-150 ${isStale ? 'opacity-50' : 'opacity-100'}`}
        title={res.errorMsg}
      >
        {res.errorLabel ?? 'error'}
      </span>
    );
  }

  if (!res.numStr) return null;

  return (
    <span className={`d-flex align-items-baseline gap-1 ms-2 transition-opacity duration-150 ${isStale ? 'opacity-50' : 'opacity-100'}`}>
      <span className="math-result-equals">=</span>
      <span className="math-result-num" onClick={copyToClipboard} title="Copy value">{res.numStr}</span>
      {res.unitStr && <UnitEditor id={id} unitStr={res.unitStr} />}
    </span>
  );
}
