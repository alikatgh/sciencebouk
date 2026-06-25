/**
 * Live computed results for the data-driven subject equations (ids 18-81).
 *
 * The ConfigurableEquationScene renders sliders for an equation's inputs, but
 * the generic stage previously only echoed those inputs back as bars. These
 * pure, typed functions compute the equation's actual OUTPUT from the current
 * slider values so the learner sees the result update live as they drag — the
 * core interactive payoff (drag F=ma's mass → watch the force change).
 *
 * Every function is a plain typed expression (no eval), keyed by the variable
 * `name`s declared in seed_subjects.py, in the units those sliders use. Only
 * equations that reduce to a single honest scalar are listed; the rest keep the
 * input-only meters. Where a constant is assumed (e.g. water density), `note`
 * states it.
 */

export interface SubjectResult {
  /** Output symbol shown in the readout, e.g. "F" or "P(A|B)". */
  symbol: string
  /** Optional unit suffix, e.g. "N", "atm", "V". */
  unit?: string
  /** Optional assumption note shown in small print, e.g. "ρ=1000 (water)". */
  note?: string
  /** Pure function of the current slider values (keyed by variable name). */
  compute: (v: Record<string, number>) => number
}

const RAD = Math.PI / 180

export const subjectResults: Record<number, SubjectResult> = {
  // ---- Computer Science ----
  19: { symbol: "steps", compute: (v) => (v.n < 1 ? NaN : Math.ceil(Math.log2(v.n))) },
  20: { symbol: "log_b a", note: "critical exponent", compute: (v) => (v.a <= 0 || v.b <= 0 || v.b === 1 ? NaN : Math.log(v.a) / Math.log(v.b)) },
  21: {
    symbol: "P(A|B)",
    compute: (v) => {
      const denom = v.sens * v.prior + v.fpr * (1 - v.prior)
      return denom === 0 ? NaN : (v.sens * v.prior) / denom
    },
  },
  22: { symbol: "θ′", note: "one step, J(θ)=θ²", compute: (v) => v.theta * (1 - 2 * v.alpha) },
  23: { symbol: "P(z₁)", compute: (v) => Math.exp(v.z1) / (Math.exp(v.z1) + Math.exp(v.z2) + Math.exp(v.z3)) },
  24: { symbol: "H", unit: "nats", compute: (v) => (v.q <= 0 ? NaN : -Math.log(v.q)) },
  25: { symbol: "QKᵀ/√dₖ", compute: (v) => v.score / Math.sqrt(v.dk) },
  // ---- Chemistry ----
  26: { symbol: "P", unit: "atm", compute: (v) => (v.n * 0.082057 * v.T) / v.V },
  27: { symbol: "k/A", note: "relative to pre-factor A", compute: (v) => Math.exp(-(v.Ea * 1000) / (8.314 * v.T)) },
  28: { symbol: "pH", compute: (v) => (v.ratio <= 0 ? NaN : v.pKa + Math.log10(v.ratio)) },
  29: { symbol: "E", unit: "V", note: "at 298 K", compute: (v) => (v.Q <= 0 ? NaN : v.E0 - ((8.314 * 298) / (v.n * 96485)) * Math.log(v.Q)) },
  30: { symbol: "A", compute: (v) => v.eps * v.l * v.c },
  31: { symbol: "ΔG", unit: "kJ/mol", compute: (v) => v.dH - (v.T * v.dS) / 1000 },
  32: { symbol: "r", unit: "M/s", note: "[B] term set to 1", compute: (v) => v.k * Math.pow(v.A, v.m) },
  33: { symbol: "dP/dT", unit: "kPa/K", compute: (v) => (v.dHvap * 1000) / (v.T * v.dV) },
  // ---- Physics ----
  34: { symbol: "F", unit: "N", compute: (v) => v.m * v.a },
  35: { symbol: "E_k", unit: "J", compute: (v) => 0.5 * v.m * v.v * v.v },
  36: { symbol: "F", unit: "N", compute: (v) => (8.99e9 * (v.q1 * 1e-6) * (v.q2 * 1e-6)) / (v.r * v.r) },
  37: { symbol: "V", unit: "V", compute: (v) => v.I * v.R },
  38: {
    symbol: "θ₂",
    unit: "°",
    note: "— = total internal reflection",
    compute: (v) => {
      const s = (v.n1 * Math.sin(v.theta1 * RAD)) / v.n2
      return s > 1 ? NaN : Math.asin(s) / RAD
    },
  },
  39: { symbol: "f′", unit: "Hz", note: "v_sound = 343 m/s", compute: (v) => (343 - v.vs === 0 ? NaN : (v.f * 343) / (343 - v.vs)) },
  40: { symbol: "P", unit: "W", compute: (v) => 5.67e-8 * v.A * Math.pow(v.T, 4) },
  42: { symbol: "Δp_min", unit: "kg·m/s", compute: (v) => 1.0545718e-34 / (2 * v.dx * 1e-9) },
  41: { symbol: "λ", unit: "m", note: "m in kg, v in m/s", compute: (v) => 6.626e-34 / (v.m * v.v) },
  43: { symbol: "E", unit: "eV", note: "ν in 10¹⁴ Hz", compute: (v) => 0.4136 * v.nu },
  44: { symbol: "F", unit: "N", note: "magnetic part, v in m/s", compute: (v) => v.q * 1e-6 * v.v * v.B },
  // ---- Biology ----
  45: { symbol: "2pq", note: "heterozygote fraction", compute: (v) => 2 * v.p * (1 - v.p) },
  46: { symbol: "dN/dt", compute: (v) => v.r * v.N * (1 - v.N / v.K) },
  47: { symbol: "v", compute: (v) => (v.Vmax * v.S) / (v.Km + v.S) },
  49: {
    symbol: "V_m",
    unit: "mV",
    note: "T=310 K, P_Na/P_K=0.04",
    compute: (v) => {
      const num = v.Ko + 0.04 * v.Nao
      return num <= 0 ? NaN : ((8.314 * 310) / 96485) * Math.log(num / (140 + 0.04 * 10)) * 1000
    },
  },
  // ---- Economics ----
  51: { symbol: "A", unit: "$", note: "annual compounding", compute: (v) => v.P * Math.pow(1 + v.r, v.t) },
  53: { symbol: "Y", compute: (v) => v.C + v.I + v.G },
  54: { symbol: "i", compute: (v) => (1 + v.r) * (1 + v.pi) - 1 },
  55: { symbol: "E(Rᵢ)", compute: (v) => v.Rf + v.beta * (v.Rm - v.Rf) },
  57: { symbol: "Y", note: "A = 1", compute: (v) => Math.pow(v.K, v.alpha) * Math.pow(v.L, 1 - v.alpha) },
  // ---- Statistics ----
  58: { symbol: "σ²", note: "variance", compute: (v) => v.spread * v.spread },
  59: { symbol: "ŷ(x=1)", note: "prediction at x=1", compute: (v) => v.beta0 + v.beta1 },
  60: { symbol: "χ²", compute: (v) => Math.pow(v.O - v.E, 2) / v.E },
  61: { symbol: "SE", note: "for σ = 1", compute: (v) => 1 / Math.sqrt(v.n) },
  62: {
    symbol: "P(k)",
    compute: (v) => {
      const k = Math.max(0, Math.round(v.k))
      let fact = 1
      for (let i = 2; i <= k; i += 1) fact *= i
      return (Math.pow(v.lam, k) * Math.exp(-v.lam)) / fact
    },
  },
  // ---- Engineering ----
  64: { symbol: "F", unit: "N", note: "x in cm", compute: (v) => (-v.k * v.x) / 100 },
  65: { symbol: "σ", unit: "GPa", compute: (v) => v.E * v.eps },
  66: { symbol: "½ρv²+ρgh", unit: "Pa", note: "ρ = 1000 (water)", compute: (v) => 0.5 * 1000 * v.v * v.v + 1000 * 9.81 * v.h },
  67: { symbol: "DC gain", compute: (v) => v.K / v.pole },
  68: { symbol: "Z", compute: (v) => v.N + v.P },
  69: { symbol: "Re", note: "ρ = 1000 (water)", compute: (v) => (1000 * v.v * v.L) / v.mu },
  // ---- Astronomy ----
  70: { symbol: "T", unit: "yr", note: "solar units", compute: (v) => Math.sqrt(Math.pow(v.a, 3) / v.M) },
  71: { symbol: "v", unit: "km/s", compute: (v) => v.H0 * v.d },
  72: { symbol: "rₛ", unit: "km", compute: (v) => (2953 * v.M) / 1000 },
  73: { symbol: "L/L☉", compute: (v) => v.R * v.R * Math.pow(v.T / 5772, 4) },
  74: { symbol: "N", note: "R∗·f_p·n_e·f_c = 1", compute: (v) => v.fl * v.fi * v.L },
  // ---- Linear Algebra ----
  76: { symbol: "mults", note: "n×n naive", compute: (v) => Math.pow(v.n, 3) },
  78: { symbol: "det", compute: (v) => v.a * v.d - v.b * v.c },
  79: { symbol: "κ", note: "condition number", compute: (v) => v.s1 / v.s2 },
  80: { symbol: "a·b", compute: (v) => v.magA * v.magB * Math.cos(v.theta * RAD) },
  81: { symbol: "|a×b|", compute: (v) => v.magA * v.magB * Math.sin(v.theta * RAD) },
}

/** Format a computed result for display; returns "—" for undefined/NaN/∞. */
export function formatResultValue(value: number): string {
  if (!Number.isFinite(value)) return "—"
  if (value === 0) return "0"
  const abs = Math.abs(value)
  if (abs >= 1e5 || abs < 1e-3) return value.toExponential(2)
  return String(Number(value.toPrecision(4)))
}
