/**
 * CFIA Label Engine — Canadian nutrition label types.
 * Aligned with Food and Drug Regulations / Safe Food for Canadians Regulations.
 */

/** Raw nutrient totals (from recipe aggregation). All values per 100g basis for label. */
export type RawNutrientTotals = {
  caloriesKcal: number;
  fatG: number;
  saturatedG: number;
  transG: number;
  carbsG: number;
  fibreG: number;
  sugarsG: number;
  proteinG: number;
  cholesterolMg: number;
  sodiumMg: number;
  potassiumMg: number;
  calciumMg: number;
  ironMg: number;
  vitaminDmcg: number;
};

/** CFIA-rounded values ready for display on Nutrition Facts table. */
export type CfiaRoundedNutrients = {
  calories: number;
  fatG: number;
  saturatedG: number;
  transG: number;
  carbsG: number;
  fibreG: number;
  sugarsG: number;
  proteinG: number;
  cholesterolMg: number;
  sodiumMg: number;
  potassiumMg: number;
  calciumMg: number;
  ironMg: number;
  vitaminDmcg: number;
};

/** Options for label generation. */
export type CfiaLabelOptions = {
  /** Serving size in grams (used for "Per X g" declaration). Default 100. */
  servingSizeG?: number;
  /** Reference amount for "Per 100 g" column if using dual declaration. */
  referenceAmountG?: number;
};

/** % Daily Value for nutrients that require it (rounded per CFIA). */
export type CfiaDailyValuePercent = {
  fat: number;
  saturatedPlusTrans: number;
  fibre: number;
  sugars: number;
  sodium: number;
  potassium: number;
  calcium: number;
  iron: number;
};

/** Full CFIA-formatted label output. */
export type CfiaLabel = {
  /** Rounded nutrients per serving. */
  perServing: CfiaRoundedNutrients;
  /** Rounded nutrients per 100g (reference amount). */
  per100g: CfiaRoundedNutrients;
  /** % Daily Value per serving (for nutrients that have DV). */
  dailyValuePercent: CfiaDailyValuePercent;
  /** Serving size used (g). */
  servingSizeG: number;
  /** Reference amount used (g), typically 100. */
  referenceAmountG: number;
};
