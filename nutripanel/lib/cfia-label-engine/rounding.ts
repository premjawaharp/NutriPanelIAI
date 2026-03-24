/**
 * CFIA rounding rules for Canadian nutrition labels.
 * Based on Food and Drug Regulations / Safe Food for Canadians Regulations.
 * Reference: https://inspection.canada.ca/food-labels/labelling/industry/nutrition-labelling
 */

/** Round to nearest multiple of increment. */
function roundToMultiple(value: number, increment: number): number {
  if (!Number.isFinite(value) || value < 0) return 0;
  if (increment <= 0) return Math.round(value);
  return Math.round(value / increment) * increment;
}

/** Energy (Calories): <5 → 0 or 1, 5–50 → 5, >50 → 10 */
export function roundCalories(v: number): number {
  if (!Number.isFinite(v) || v < 0) return 0;
  if (v < 5) return roundToMultiple(v, 1);
  if (v <= 50) return roundToMultiple(v, 5);
  return roundToMultiple(v, 10);
}

/** Fats (total, saturated, trans): <0.5 → 0.1, 0.5–5 → 0.5, >5 → 1 */
export function roundFatG(v: number): number {
  if (!Number.isFinite(v) || v < 0) return 0;
  if (v < 0.5) return Math.round(v * 10) / 10;
  if (v <= 5) return roundToMultiple(v, 0.5);
  return roundToMultiple(v, 1);
}

/** Carbs, fibre, sugars: <0.5 → 0, ≥0.5 → 1 */
export function roundCarbsG(v: number): number {
  if (!Number.isFinite(v) || v < 0) return 0;
  if (v < 0.5) return 0;
  return roundToMultiple(v, 1);
}

/** Protein: <0.5 → 0.1, ≥0.5 → 1 */
export function roundProteinG(v: number): number {
  if (!Number.isFinite(v) || v < 0) return 0;
  if (v < 0.5) return Math.round(v * 10) / 10;
  return roundToMultiple(v, 1);
}

/** Cholesterol: <2 → 5 (or 0 if "free"); we use 5 for consistency */
export function roundCholesterolMg(v: number): number {
  if (!Number.isFinite(v) || v < 0) return 0;
  if (v < 2) return roundToMultiple(v, 5);
  return roundToMultiple(v, 5);
}

/** Sodium: <5 → 1, 5–140 → 5, >140 → 10 */
export function roundSodiumMg(v: number): number {
  if (!Number.isFinite(v) || v < 0) return 0;
  if (v < 5) return roundToMultiple(v, 1);
  if (v <= 140) return roundToMultiple(v, 5);
  return roundToMultiple(v, 10);
}

/** Potassium, Calcium: <5 → 0, 5–50 → 10, 50–250 → 25, ≥250 → 50 */
export function roundPotassiumOrCalciumMg(v: number): number {
  if (!Number.isFinite(v) || v < 0) return 0;
  if (v < 5) return 0;
  if (v <= 50) return roundToMultiple(v, 10);
  if (v <= 250) return roundToMultiple(v, 25);
  return roundToMultiple(v, 50);
}

/** Iron (mg): <0.05 → 0, 0.05–0.5 → 0.1, 0.5–2.5 → 0.25, ≥2.5 → 0.5 */
export function roundIronMg(v: number): number {
  if (!Number.isFinite(v) || v < 0) return 0;
  if (v < 0.05) return 0;
  if (v <= 0.5) return Math.round(v * 10) / 10;
  if (v <= 2.5) return roundToMultiple(v, 0.25);
  return roundToMultiple(v, 0.5);
}

/** Vitamin D (µg): <0.1 → 0, 0.1–1 → 0.2, 1–5 → 0.5, ≥5 → 1 */
export function roundVitaminDmcg(v: number): number {
  if (!Number.isFinite(v) || v < 0) return 0;
  if (v < 0.1) return 0;
  if (v <= 1) return roundToMultiple(v, 0.2);
  if (v <= 5) return roundToMultiple(v, 0.5);
  return roundToMultiple(v, 1);
}
