/**
 * Canada Daily Values (DV) for % Daily Value calculation.
 * Source: Health Canada Table of Daily Values (children 4+ and adults).
 * Reference: https://www.canada.ca/en/health-canada/services/technical-documents-labelling-requirements/table-daily-values
 */

export const DAILY_VALUES = {
  fatG: 75,
  saturatedPlusTransG: 20,
  carbohydrateG: 275,
  fibreG: 28,
  sugarsG: 100,
  sodiumMg: 2300,
  potassiumMg: 3400,
  calciumMg: 1300,
  ironMg: 18,
  vitaminDmcg: 20,
} as const;

/** Round % DV to nearest 1% (CFIA rule). */
function roundPercentDv(v: number): number {
  if (!Number.isFinite(v) || v < 0) return 0;
  return Math.round(v);
}

export function calcFatDvPercent(fatG: number): number {
  return roundPercentDv((fatG / DAILY_VALUES.fatG) * 100);
}

export function calcSaturatedPlusTransDvPercent(saturatedG: number, transG: number): number {
  const combined = saturatedG + transG;
  return roundPercentDv((combined / DAILY_VALUES.saturatedPlusTransG) * 100);
}

export function calcFibreDvPercent(fibreG: number): number {
  return roundPercentDv((fibreG / DAILY_VALUES.fibreG) * 100);
}

export function calcSugarsDvPercent(sugarsG: number): number {
  return roundPercentDv((sugarsG / DAILY_VALUES.sugarsG) * 100);
}

export function calcSodiumDvPercent(sodiumMg: number): number {
  return roundPercentDv((sodiumMg / DAILY_VALUES.sodiumMg) * 100);
}

export function calcPotassiumDvPercent(potassiumMg: number): number {
  return roundPercentDv((potassiumMg / DAILY_VALUES.potassiumMg) * 100);
}

export function calcCalciumDvPercent(calciumMg: number): number {
  return roundPercentDv((calciumMg / DAILY_VALUES.calciumMg) * 100);
}

export function calcIronDvPercent(ironMg: number): number {
  return roundPercentDv((ironMg / DAILY_VALUES.ironMg) * 100);
}

export function calcVitaminDDvPercent(vitaminDmcg: number): number {
  return roundPercentDv((vitaminDmcg / DAILY_VALUES.vitaminDmcg) * 100);
}
