export const getCantileverExample = () => {
  const id = () => crypto.randomUUID();

  const blocks = [
    { id: id(), x: 60, y: 60, type: 'section', expression: 'Cantilever Beam Calculation' },
    { id: id(), x: 60, y: 120, type: 'text', expression: 'A 1m long steel angle (RSA 100x100x10) is subjected to a point load at the tip.' },

    // Step 2: Added the native LaTeX strings so they render beautifully with real fractions & symbols
    { id: id(), x: 60, y: 200, type: 'math', expression: 'L = 1 m', latex: 'L = 1\\text{ m}' },
    { id: id(), x: 60, y: 240, type: 'math', expression: 'P = 5 kN', latex: 'P = 5\\text{ kN}' },
    { id: id(), x: 60, y: 280, type: 'math', expression: 'E = 200 GPa', latex: 'E = 200\\text{ GPa}' },
    { id: id(), x: 60, y: 320, type: 'math', expression: 'I = 1.45e6 mm^4', latex: 'I = 1.45\\cdot 10^6\\text{ mm}^4' },
    { id: id(), x: 60, y: 360, type: 'math', expression: 'y = 28.2 mm', latex: 'y = 28.2\\text{ mm}' },

    { id: id(), x: 60, y: 440, type: 'section', expression: 'Results' },
    { id: id(), x: 60, y: 500, type: 'math', expression: 'M = P * L', latex: 'M = P \\cdot L' },
    { id: id(), x: 60, y: 540, type: 'math', expression: 'delta = (P * L^3) / (3 * E * I)', latex: '\\delta = \\frac{P \\cdot L^3}{3 \\cdot E \\cdot I}' },
    { id: id(), x: 60, y: 580, type: 'math', expression: 'sigma = (M * y) / I', latex: '\\sigma = \\frac{M \\cdot y}{I}' }
  ];

  const overrides = {
    [blocks[8].id]: 'kN m',
    [blocks[9].id]: 'mm',
    [blocks[10].id]: 'MPa'
  };

  return { savedBlocks: blocks, savedOverrides: overrides };
};
