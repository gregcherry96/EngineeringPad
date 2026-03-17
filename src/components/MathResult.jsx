import React, { useState } from 'react';
import UnitEditor from './UnitEditor';

export default function MathResult({ id, res, isStale }) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = (e) => {
    e.stopPropagation();

    if (!res.numStr) return;

    const raw = res.numStr
      .replace(/\s×\s10/g, 'e')
      .replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹⁻]/g, c => '⁰¹²³⁴⁵⁶⁷⁸⁹⁻'.indexOf(c).toString().replace('10', '-'));
    navigator.clipboard?.writeText(raw);

    // Step 1: Provide visual feedback for copying
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  if (res.error) {
    if (res.errorLabel === 'unit error') {
      return (
        <span className={`d-flex align-items-baseline gap-1 ms-2 transition-opacity duration-150 ${isStale ? 'opacity-50' : 'opacity-100'}`}>
          <span className="math-result-equals">=</span>
          <span
            className={`math-result-num ${copied ? 'text-success transition-colors duration-150' : ''}`}
            onClick={copyToClipboard}
            title="Copy base value"
            style={{ cursor: 'pointer' }}
          >
            {res.numStr} {copied && <span className="ms-1" style={{ fontSize: '0.8em' }}>✓</span>}
          </span>
          <UnitEditor id={id} unitStr={res.unitStr} isError={true} />
        </span>
      );
    }

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
      <span
        className={`math-result-num ${copied ? 'text-success transition-colors duration-150' : ''}`}
        onClick={copyToClipboard}
        title="Copy value"
        style={{ cursor: 'pointer' }}
      >
        {res.numStr} {copied && <span className="ms-1" style={{ fontSize: '0.8em' }}>✓</span>}
      </span>
      {res.unitStr && <UnitEditor id={id} unitStr={res.unitStr} />}
    </span>
  );
}
