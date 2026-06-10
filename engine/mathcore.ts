/**
 * Vision Engine — mathcore.
 *
 * TVM (5 variables, BEG/END), geometric rate conversions (BR convention),
 * exact Fisher, growing annuities. Pure functions, full precision (C10).
 */
import type { Timing, TVMQuery } from "./types";

/* ----------------------------------------------------- rate conversions */

/**
 * Effective annual → effective monthly (C2, convenção BR):
 * i_m = (1+i_aa)^(1/12) − 1. NEVER divide a nominal rate by 12 (US APR).
 */
export function annualToMonthly(iAA: number): number {
  return Math.pow(1 + iAA, 1 / 12) - 1;
}

/** Effective monthly → effective annual. */
export function monthlyToAnnual(iM: number): number {
  return Math.pow(1 + iM, 12) - 1;
}

/** Effective rate conversion between arbitrary period counts per year. */
export function convertRate(i: number, fromPeriodsPerYear: number, toPeriodsPerYear: number): number {
  return Math.pow(1 + i, fromPeriodsPerYear / toPeriodsPerYear) - 1;
}

/* ------------------------------------------------------------- Fisher */

/** Exact Fisher (C3): real = (1+nominal)/(1+inflation) − 1. Never subtract. */
export function fisherReal(nominal: number, inflacao: number): number {
  return (1 + nominal) / (1 + inflacao) - 1;
}

/** Exact Fisher inverse: nominal = (1+real)(1+inflation) − 1. */
export function fisherNominal(real: number, inflacao: number): number {
  return (1 + real) * (1 + inflacao) - 1;
}

/* ---------------------------------------------------------------- TVM */

const EPS_RATE = 1e-12;

/** (1+i)^n with the i≈0 fast path. */
function pow1p(i: number, n: number): number {
  return Math.abs(i) < EPS_RATE ? 1 : Math.pow(1 + i, n);
}

/** Annuity compound factor Σ (1+i)^k — future value of 1/period at END. */
function fvFactor(i: number, n: number): number {
  if (Math.abs(i) < EPS_RATE) return n;
  return (Math.pow(1 + i, n) - 1) / i;
}

/**
 * HP-12C cash-flow identity (signs matter: outflows negative):
 *   pv·(1+i)^n + pmt·(1 + i·s)·[((1+i)^n − 1)/i] + fv = 0
 * where s = 1 for "begin", 0 for "end" (C5).
 */
export function tvmResidual(n: number, i: number, pv: number, pmt: number, fv: number, timing: Timing): number {
  const s = timing === "begin" ? 1 : 0;
  return pv * pow1p(i, n) + pmt * (1 + i * s) * fvFactor(i, n) + fv;
}

/**
 * Solve the missing TVM variable (exactly one of n, i, pv, pmt, fv must be
 * undefined). i and n are solved by robust bisection (sign-scan bracket).
 */
export function solveTVM(q: TVMQuery): number {
  const timing: Timing = q.timing ?? "end";
  const missing = (["n", "i", "pv", "pmt", "fv"] as const).filter((k) => q[k] === undefined);
  if (missing.length !== 1) {
    throw new Error(`solveTVM: exactly one variable must be missing (got ${missing.length})`);
  }
  const { n, i, pv = 0, pmt = 0, fv = 0 } = q;

  switch (missing[0]) {
    case "fv":
      return -(pv! * pow1p(i!, n!) + pmt! * (1 + i! * (timing === "begin" ? 1 : 0)) * fvFactor(i!, n!));
    case "pv": {
      const s = timing === "begin" ? 1 : 0;
      return -(pmt! * (1 + i! * s) * fvFactor(i!, n!) + fv!) / pow1p(i!, n!);
    }
    case "pmt": {
      const s = timing === "begin" ? 1 : 0;
      const f = fvFactor(i!, n!) * (1 + i! * s);
      if (f === 0) throw new Error("solveTVM: pmt undefined for n=0");
      return -(pv! * pow1p(i!, n!) + fv!) / f;
    }
    case "n": {
      const res = (nn: number) => tvmResidual(nn, i!, pv!, pmt!, fv!, timing);
      return bisect(res, 0, 12000, "n");
    }
    case "i": {
      const res = (ii: number) => tvmResidual(n!, ii, pv!, pmt!, fv!, timing);
      return bisect(res, -0.9999, 10, "i");
    }
  }
}

/** Robust bisection: scans for a sign change, then converges to 1e-12. */
function bisect(f: (x: number) => number, lo: number, hi: number, label: string): number {
  let a = lo;
  let b = hi;
  let fa = f(a);
  if (fa === 0) return a;
  // Scan for a bracket (the residual can be non-monotonic in i).
  const STEPS = 400;
  let found = false;
  let prevX = a;
  let prevF = fa;
  for (let k = 1; k <= STEPS; k++) {
    const x = lo + ((hi - lo) * k) / STEPS;
    const fx = f(x);
    if (fx === 0) return x;
    if (prevF * fx < 0) {
      a = prevX;
      b = x;
      fa = prevF;
      found = true;
      break;
    }
    prevX = x;
    prevF = fx;
  }
  if (!found) throw new Error(`solveTVM: no solution bracket found for ${label}`);
  for (let k = 0; k < 200; k++) {
    const m = (a + b) / 2;
    const fm = f(m);
    if (fm === 0 || (b - a) / 2 < 1e-12) return m;
    if (fa * fm < 0) {
      b = m;
    } else {
      a = m;
      fa = fm;
    }
  }
  return (a + b) / 2;
}

/* -------------------------------------------- annuity convenience (≥ 0) */

/** FV of a level payment series (positive magnitudes), END/BEG (C5). */
export function fvAnnuity(pmt: number, i: number, n: number, timing: Timing = "end"): number {
  const f = fvFactor(i, n);
  return pmt * f * (timing === "begin" ? 1 + i : 1);
}

/** PV of a level payment series (positive magnitudes), END/BEG. */
export function pvAnnuity(pmt: number, i: number, n: number, timing: Timing = "end"): number {
  if (n <= 0) return 0;
  if (Math.abs(i) < EPS_RATE) return pmt * n;
  const f = (1 - Math.pow(1 + i, -n)) / i;
  return pmt * f * (timing === "begin" ? 1 + i : 1);
}

/* -------------------------------------------------- growing annuities */

/**
 * PV of a growing annuity (first payment C at end of period 1, growing g per
 * period) — C6. Includes the g = r case: PV = n·C/(1+r).
 */
export function pvGrowingAnnuity(c: number, r: number, g: number, n: number, timing: Timing = "end"): number {
  if (n <= 0) return 0;
  let pv: number;
  if (Math.abs(r - g) < 1e-12) {
    pv = (n * c) / (1 + r);
  } else {
    pv = (c / (r - g)) * (1 - Math.pow((1 + g) / (1 + r), n));
  }
  return timing === "begin" ? pv * (1 + r) : pv;
}

/** FV of a growing annuity at the end of period n. */
export function fvGrowingAnnuity(c: number, r: number, g: number, n: number, timing: Timing = "end"): number {
  return pvGrowingAnnuity(c, r, g, n, timing) * pow1p(r, n);
}
