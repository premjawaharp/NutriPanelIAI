/**
 * CFIA Label Engine — Generates CFIA-compliant Canadian nutrition labels.
 *
 * Consumes raw nutrient totals (from recipe aggregation) and applies
 * Food and Drug Regulations rounding rules. Output is suitable for
 * display on Nutrition Facts tables.
 */
import type {
  CfiaDailyValuePercent,
  CfiaLabel,
  CfiaLabelOptions,
  CfiaRoundedNutrients,
  RawNutrientTotals,
} from "./types";
import {
  calcCalciumDvPercent,
  calcFibreDvPercent,
  calcFatDvPercent,
  calcIronDvPercent,
  calcPotassiumDvPercent,
  calcSaturatedPlusTransDvPercent,
  calcSodiumDvPercent,
  calcSugarsDvPercent,
} from "./daily-values";
import {
  roundCalories,
  roundCarbsG,
  roundCholesterolMg,
  roundFatG,
  roundIronMg,
  roundPotassiumOrCalciumMg,
  roundProteinG,
  roundSodiumMg,
  roundVitaminDmcg,
} from "./rounding";

function applyRounding(raw: RawNutrientTotals): CfiaRoundedNutrients {
  return {
    calories: roundCalories(raw.caloriesKcal),
    fatG: roundFatG(raw.fatG),
    saturatedG: roundFatG(raw.saturatedG),
    transG: roundFatG(raw.transG),
    carbsG: roundCarbsG(raw.carbsG),
    fibreG: roundCarbsG(raw.fibreG),
    sugarsG: roundCarbsG(raw.sugarsG),
    proteinG: roundProteinG(raw.proteinG),
    cholesterolMg: roundCholesterolMg(raw.cholesterolMg),
    sodiumMg: roundSodiumMg(raw.sodiumMg),
    potassiumMg: roundPotassiumOrCalciumMg(raw.potassiumMg),
    calciumMg: roundPotassiumOrCalciumMg(raw.calciumMg),
    ironMg: roundIronMg(raw.ironMg),
    vitaminDmcg: roundVitaminDmcg(raw.vitaminDmcg),
  };
}

/**
 * Generate a CFIA-formatted nutrition label from raw nutrient totals.
 *
 * @param perServingRaw — Raw nutrients for one serving (e.g. batch / servingsCount)
 * @param per100gRaw — Raw nutrients per 100g (reference amount)
 * @param options — Optional serving size and reference amount
 * @returns Label with rounded values per serving and per 100g
 */
function calcDailyValuePercent(rounded: CfiaRoundedNutrients): CfiaDailyValuePercent {
  return {
    fat: calcFatDvPercent(rounded.fatG),
    saturatedPlusTrans: calcSaturatedPlusTransDvPercent(rounded.saturatedG, rounded.transG),
    fibre: calcFibreDvPercent(rounded.fibreG),
    sugars: calcSugarsDvPercent(rounded.sugarsG),
    sodium: calcSodiumDvPercent(rounded.sodiumMg),
    potassium: calcPotassiumDvPercent(rounded.potassiumMg),
    calcium: calcCalciumDvPercent(rounded.calciumMg),
    iron: calcIronDvPercent(rounded.ironMg),
  };
}

export function generateCfiaLabel(
  perServingRaw: RawNutrientTotals,
  per100gRaw: RawNutrientTotals,
  options: CfiaLabelOptions = {}
): CfiaLabel {
  const servingSizeG = options.servingSizeG ?? 100;
  const referenceAmountG = options.referenceAmountG ?? 100;
  const perServing = applyRounding(perServingRaw);
  const per100g = applyRounding(per100gRaw);

  return {
    perServing,
    per100g,
    dailyValuePercent: calcDailyValuePercent(perServing),
    servingSizeG,
    referenceAmountG,
  };
}

export * from "./types";
export * from "./rounding";
export * from "./daily-values";
