import * as math from 'mathjs';

/**
 * constants.js
 *
 * Physical constants are defined as math.unit() objects so that math.js
 * carries dimensions through every calculation automatically.
 * e.g.  g * (70 kg)  →  686.455 N
 *       h * (600e-9 m / c)  →  energy in joules
 *
 * Pure dimensionless numbers (π, φ, …) stay as plain JS numbers.
 *
 * Spread into every math.evaluate() call:
 *   const scope = { ...MATH_SCOPE, ...userVars };
 *   math.evaluate(expression, scope);
 */

// ─── Helper ──────────────────────────────────────────────────────────────────
const u = (val, unitStr) => math.unit(val, unitStr);

// ─── Scope object ─────────────────────────────────────────────────────────────
export const MATH_SCOPE = {

  // ── Dimensionless mathematical constants ────────────────────────────────
  pi:    Math.PI,           // 3.14159…
  tau:   2 * Math.PI,       // 2π
  phi:   1.6180339887,      // golden ratio
  e:     Math.E,            // 2.71828…
  ln2:   Math.LN2,
  ln10:  Math.LN10,
  sqrt2: Math.SQRT2,

  // ── Mechanics ───────────────────────────────────────────────────────────
  g:     u(9.80665,         'm / s^2'),      // standard gravity
  G:     u(6.67430e-11,     'm^3 / (kg s^2)'), // gravitational constant

  // ── Electromagnetism ────────────────────────────────────────────────────
  c:     u(2.99792458e8,    'm / s'),        // speed of light
  mu0:   u(1.25663706212e-6,'N / A^2'),      // permeability of free space
  eps0:  u(8.8541878128e-12,'F / m'),        // permittivity of free space
  eV:    u(1.602176634e-19, 'J'),            // electron-volt

  // Elementary charge — math.js reserves 'e'; use e_charge
  e_charge: u(1.602176634e-19, 'C'),

  // ── Quantum / Atomic ────────────────────────────────────────────────────
  h:     u(6.62607015e-34,  'J s'),          // Planck's constant
  hbar:  u(1.054571817e-34, 'J s'),          // reduced Planck (ħ)
  m_e:   u(9.1093837015e-31,'kg'),           // electron mass
  m_p:   u(1.67262192369e-27,'kg'),          // proton mass
  m_n:   u(1.67492749804e-27,'kg'),          // neutron mass
  a0:    u(5.29177210903e-11,'m'),           // Bohr radius

  // ── Thermodynamics ──────────────────────────────────────────────────────
  k_B:   u(1.380649e-23,   'J / K'),         // Boltzmann constant
  N_A:   u(6.02214076e23,  'mol^-1'),        // Avogadro's number
  R:     u(8.314462618,    'J / (mol K)'),   // ideal gas constant
  sigma: u(5.670374419e-8, 'W / (m^2 K^4)'),// Stefan-Boltzmann constant
  atm:   u(101325,         'Pa'),            // standard atmosphere
  T_stp: u(273.15,         'K'),             // 0 °C in kelvin

  // ── Unit conversion factors (dimensionless multipliers) ─────────────────
  // Use these to convert: e.g.  45 * deg  →  0.785 rad
  deg:   Math.PI / 180,    // degrees → radians
  ft:    0.3048,           // feet → metres
  inch:  0.0254,           // inches → metres
  mile:  1609.344,         // miles → metres
  lb:    0.45359237,       // pounds → kg
  oz:    0.028349523,      // ounces → kg
  galUS: 3.785411784e-3,   // US gallons → m³
  hp:    745.69987,        // horsepower → watts
  cal:   4.184,            // calories → joules
  kcal:  4184,             // kcal → joules
  kWh:   3.6e6,            // kWh → joules
  bar:   1e5,              // bar → Pa
  psi:   6894.757,         // psi → Pa
  mmHg:  133.322,          // mmHg → Pa
};

// ─── Sidebar catalogue ────────────────────────────────────────────────────────
export const SIDEBAR_CATALOGUE = [
  {
    group: 'Math constants',
    icon: 'π',
    items: [
      { label: 'π  (pi)',          insert: 'pi',       value: '3.14159…' },
      { label: 'τ  (2π)',          insert: 'tau',       value: '6.28318…' },
      { label: 'e  (Euler)',       insert: 'e',         value: '2.71828…' },
      { label: 'φ  (golden)',      insert: 'phi',       value: '1.61803…' },
      { label: '√2',               insert: 'sqrt2',     value: '1.41421…' },
    ],
  },
  {
    group: 'Mechanics',
    icon: 'g',
    items: [
      { label: 'g  (gravity)',     insert: 'g',         value: '9.80665 m/s²' },
      { label: 'G  (grav. const)', insert: 'G',         value: '6.674×10⁻¹¹ m³/(kg·s²)' },
    ],
  },
  {
    group: 'Electromagnetism',
    icon: 'c',
    items: [
      { label: 'c  (light speed)', insert: 'c',         value: '2.998×10⁸ m/s' },
      { label: 'μ₀ (permeab.)',    insert: 'mu0',       value: '1.257×10⁻⁶ N/A²' },
      { label: 'ε₀ (permitt.)',    insert: 'eps0',      value: '8.854×10⁻¹² F/m' },
      { label: 'e  (charge)',      insert: 'e_charge',  value: '1.602×10⁻¹⁹ C' },
      { label: 'eV (electron-V)',  insert: 'eV',        value: '1.602×10⁻¹⁹ J' },
    ],
  },
  {
    group: 'Quantum / Atomic',
    icon: 'ħ',
    items: [
      { label: 'h  (Planck)',      insert: 'h',         value: '6.626×10⁻³⁴ J·s' },
      { label: 'ħ  (reduced h)',   insert: 'hbar',      value: '1.055×10⁻³⁴ J·s' },
      { label: 'mₑ (electron)',    insert: 'm_e',       value: '9.109×10⁻³¹ kg' },
      { label: 'mₚ (proton)',      insert: 'm_p',       value: '1.673×10⁻²⁷ kg' },
      { label: 'a₀ (Bohr r.)',     insert: 'a0',        value: '5.292×10⁻¹¹ m' },
    ],
  },
  {
    group: 'Thermodynamics',
    icon: 'k',
    items: [
      { label: 'kB (Boltzmann)',   insert: 'k_B',       value: '1.381×10⁻²³ J/K' },
      { label: 'NA (Avogadro)',    insert: 'N_A',       value: '6.022×10²³ mol⁻¹' },
      { label: 'R  (gas const.)',  insert: 'R',         value: '8.314 J/(mol·K)' },
      { label: 'σ  (Stefan-B.)',   insert: 'sigma',     value: '5.670×10⁻⁸ W/(m²·K⁴)' },
      { label: 'atm (pressure)',   insert: 'atm',       value: '101325 Pa' },
      { label: 'T_stp (0 °C)',     insert: 'T_stp',     value: '273.15 K' },
    ],
  },
  {
    group: 'Unit conversions',
    icon: '→',
    items: [
      { label: 'deg → rad',        insert: 'deg',       value: 'π/180' },
      { label: 'ft → m',           insert: 'ft',        value: '0.3048' },
      { label: 'inch → m',         insert: 'inch',      value: '0.0254' },
      { label: 'mile → m',         insert: 'mile',      value: '1609.344' },
      { label: 'lb → kg',          insert: 'lb',        value: '0.4536' },
      { label: 'hp → W',           insert: 'hp',        value: '745.7' },
      { label: 'cal → J',          insert: 'cal',       value: '4.184' },
      { label: 'kWh → J',          insert: 'kWh',       value: '3.6×10⁶' },
      { label: 'bar → Pa',         insert: 'bar',       value: '100000' },
      { label: 'psi → Pa',         insert: 'psi',       value: '6894.8' },
    ],
  },
  {
    group: 'Trigonometry',
    icon: '∿',
    items: [
      { label: 'sin(x)',           insert: 'sin(',      value: 'sine' },
      { label: 'cos(x)',           insert: 'cos(',      value: 'cosine' },
      { label: 'tan(x)',           insert: 'tan(',      value: 'tangent' },
      { label: 'asin(x)',          insert: 'asin(',     value: 'arcsine' },
      { label: 'acos(x)',          insert: 'acos(',     value: 'arccosine' },
      { label: 'atan(x)',          insert: 'atan(',     value: 'arctangent' },
      { label: 'atan2(y,x)',       insert: 'atan2(',    value: '4-quadrant' },
      { label: 'sinh(x)',          insert: 'sinh(',     value: 'hyp. sin' },
      { label: 'cosh(x)',          insert: 'cosh(',     value: 'hyp. cos' },
      { label: 'tanh(x)',          insert: 'tanh(',     value: 'hyp. tan' },
    ],
  },
  {
    group: 'Exponential & Log',
    icon: 'eˣ',
    items: [
      { label: 'sqrt(x)',          insert: 'sqrt(',     value: 'square root' },
      { label: 'cbrt(x)',          insert: 'cbrt(',     value: 'cube root' },
      { label: 'exp(x)',           insert: 'exp(',      value: 'eˣ' },
      { label: 'log(x)',           insert: 'log(',      value: 'natural log' },
      { label: 'log10(x)',         insert: 'log10(',    value: 'log base 10' },
      { label: 'log2(x)',          insert: 'log2(',     value: 'log base 2' },
      { label: 'abs(x)',           insert: 'abs(',      value: 'absolute value' },
      { label: 'pow(x, n)',        insert: 'pow(',      value: 'power' },
    ],
  },
  {
    group: 'Rounding',
    icon: '⌊⌋',
    items: [
      { label: 'round(x)',         insert: 'round(',    value: 'nearest integer' },
      { label: 'floor(x)',         insert: 'floor(',    value: 'round down' },
      { label: 'ceil(x)',          insert: 'ceil(',     value: 'round up' },
      { label: 'fix(x)',           insert: 'fix(',      value: 'truncate' },
      { label: 'sign(x)',          insert: 'sign(',     value: '−1, 0, or 1' },
    ],
  },
  {
    group: 'Statistics',
    icon: 'Σ',
    items: [
      { label: 'min(a, b, …)',     insert: 'min(',      value: 'minimum' },
      { label: 'max(a, b, …)',     insert: 'max(',      value: 'maximum' },
      { label: 'mean([…])',        insert: 'mean(',     value: 'average' },
      { label: 'median([…])',      insert: 'median(',   value: 'median' },
      { label: 'std([…])',         insert: 'std(',      value: 'std deviation' },
      { label: 'sum([…])',         insert: 'sum(',      value: 'sum of array' },
      { label: 'prod([…])',        insert: 'prod(',     value: 'product of array' },
    ],
  },
  {
    group: 'Number theory',
    icon: '#',
    items: [
      { label: 'factorial(n)',     insert: 'factorial(', value: 'n!' },
      { label: 'gcd(a, b)',        insert: 'gcd(',       value: 'greatest common div.' },
      { label: 'lcm(a, b)',        insert: 'lcm(',       value: 'least common mult.' },
      { label: 'mod(a, b)',        insert: 'mod(',       value: 'remainder' },
      { label: 'combinations(n,k)',insert: 'combinations(', value: 'nCk' },
      { label: 'permutations(n,k)',insert: 'permutations(', value: 'nPk' },
    ],
  },
];
