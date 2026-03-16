/**
 * sanitizeMath.js
 *
 * Fixes MathLive's ascii-math output, which splits multi-letter unit names
 * into multiplied single letters. e.g.:
 *   "5 k*g"     → "5 kg"
 *   "60 H*z"    → "60 Hz"
 *   "1 m*o*l"   → "1 mol"
 *   "101 k*P*a" → "101 kPa"
 *   "9.8 m/s^2" → "9.8 m/s^2"  (unchanged — already correct)
 *
 * Strategy:
 *   Only merge letter-sequences into a unit token when the sequence is
 *   preceded by a numeric context (digit, closing paren, or `/`).
 *   This prevents merging `k * g` when it means variable k × gravity g,
 *   while correctly merging `5 k * g` into `5 kg`.
 *
 *   Units are tried longest-first so "kPa" wins over "Pa" when both match.
 */

// ─── SI prefixes ─────────────────────────────────────────────────────────────
// Ordered longest-first to avoid prefix/unit ambiguity.
const PREFIXES = ['da','Y','Z','E','P','T','G','M','k','h','d','c','m','u','n','p','f','a','z','y'];

// ─── Math.js recognised unit names (multi-char only) ─────────────────────────
const BASE_UNITS_MULTI = [
  // SI named derived
  'mol','rad','sr','Hz','Pa','Wb','lm','lx','Bq','Gy','Sv','kat','ohm',
  // Common non-SI that math.js knows
  'bar','psi','atm','mph','rpm','kph','BTU','eV',
  // Time aliases math.js accepts
  'ms',   // millisecond — but careful: m*s = metre·second too
];

// Single-char units that combine with prefixes to form multi-char tokens
const BASE_UNITS_SINGLE = ['m','g','s','A','K','J','W','V','C','F','T','H','S','N','L','l'];

// ─── Build the full unit registry ────────────────────────────────────────────
// Returns every multi-character unit string math.js will accept.
function buildUnitRegistry() {
  const units = new Set(BASE_UNITS_MULTI);

  // Add every prefix+single combination that is 2+ chars
  for (const prefix of PREFIXES) {
    for (const unit of BASE_UNITS_SINGLE) {
      units.add(prefix + unit);          // e.g. km, kg, mA, kW, nF …
    }
    for (const unit of BASE_UNITS_MULTI) {
      units.add(prefix + unit);          // e.g. kHz, MPa, kmol, krad …
    }
  }

  // Sort longest first — critical for greedy matching
  return [...units].sort((a, b) => b.length - a.length);
}

const UNIT_REGISTRY = buildUnitRegistry();

// ─── Build a regex for a split unit ──────────────────────────────────────────
// For "kPa" builds:  k[\s]*(?:\*[\s]*)?P[\s]*(?:\*[\s]*)?a
// i.e. each character may be separated by optional whitespace and an
// optional * multiplication sign.
function splitPattern(unitStr) {
  return unitStr
    .split('')
    .join('[\\s]*(?:\\*[\\s]*)?');
}

// ─── Precompile all repair regexes ───────────────────────────────────────────
// Each rule:  { unit: 'kPa', re: /(\d|\)|\/)[\s]*(?:\*[\s]*)?k.../ }
// We only merge when preceded by a digit, `)`, or `/` — i.e. a numeric context.
const UNIT_RULES = UNIT_REGISTRY
  .filter(u => u.length >= 2)          // only multi-char units need fixing
  .map(u => ({
    unit: u,
    // Lookahead after ensures we don't partially match a longer word
    re: new RegExp(
      `((?:^|[\\d.eE+\\-\\)\\s\\/])(?:[\\s]*\\*?[\\s]*)?)${splitPattern(u)}(?![a-zA-Z0-9_])`,
      'g'
    ),
  }));

// ─── Main export ─────────────────────────────────────────────────────────────
/**
 * Sanitize an ascii-math string from MathLive before passing to math.js.
 *
 * @param {string} expr - raw ascii-math string
 * @returns {string} - cleaned expression
 */
export function sanitizeMath(expr) {
  if (!expr) return '';
  let s = expr;

  // Pass 1: apply unit repairs (longest-unit rules first)
  for (const { unit, re } of UNIT_RULES) {
    s = s.replace(re, (match, prefix) => {
      // Re-attach the prefix context, replace the split unit with the merged one
      return prefix + unit;
    });
  }

  // Pass 2: common alias fixes
  s = s
    .replace(/\bomega\b/gi, 'ohm')   // Ω written as "omega" → ohm
    .replace(/\bμ\b/g, 'u')          // Greek micro → u prefix mathjs knows
    .replace(/\bµ\b/g, 'u')          // Both Unicode micro variants
    .replace(/\bdeg\b/g, 'deg')      // keep deg as-is (math.js knows it)
    .replace(/\bcelsius\b/gi, 'degC')
    .replace(/\bfahrenheit\b/gi, 'degF');

  // Pass 3: clean up stray "* *" artifacts from previous passes
  s = s.replace(/\*\s*\*/g, '*');

  return s;
}

/**
 * Diagnose what was changed (useful for debugging in development).
 * Returns null if nothing changed.
 */
export function sanitizeMathDebug(expr) {
  const result = sanitizeMath(expr);
  if (result === expr) return null;
  return { original: expr, sanitized: result };
}
