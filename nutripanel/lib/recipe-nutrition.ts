import { db } from "@/lib/db";
import { generateCfiaLabel } from "@/lib/cfia-label-engine";

type NutrientTotals = {
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

function zeroTotals(): NutrientTotals {
  return {
    caloriesKcal: 0,
    fatG: 0,
    saturatedG: 0,
    transG: 0,
    carbsG: 0,
    fibreG: 0,
    sugarsG: 0,
    proteinG: 0,
    cholesterolMg: 0,
    sodiumMg: 0,
    potassiumMg: 0,
    calciumMg: 0,
    ironMg: 0,
    vitaminDmcg: 0,
  };
}

function toNumber(v: unknown): number {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  if (typeof v === "string") {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }
  if (v && typeof v === "object" && "toNumber" in v && typeof (v as { toNumber: unknown }).toNumber === "function") {
    const n = (v as { toNumber: () => number }).toNumber();
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function round4(n: number): number {
  return Number(n.toFixed(4));
}

function scaleTotals(base: NutrientTotals, factor: number): NutrientTotals {
  return {
    caloriesKcal: round4(base.caloriesKcal * factor),
    fatG: round4(base.fatG * factor),
    saturatedG: round4(base.saturatedG * factor),
    transG: round4(base.transG * factor),
    carbsG: round4(base.carbsG * factor),
    fibreG: round4(base.fibreG * factor),
    sugarsG: round4(base.sugarsG * factor),
    proteinG: round4(base.proteinG * factor),
    cholesterolMg: round4(base.cholesterolMg * factor),
    sodiumMg: round4(base.sodiumMg * factor),
    potassiumMg: round4(base.potassiumMg * factor),
    calciumMg: round4(base.calciumMg * factor),
    ironMg: round4(base.ironMg * factor),
    vitaminDmcg: round4(base.vitaminDmcg * factor),
  };
}

export async function getRecipeNutrition(recipeId: string, userId: string) {
  const recipe = await db.recipe.findFirst({
    where: { id: recipeId, userId },
    include: {
      ingredients: {
        include: {
          ingredient: {
            include: {
              nutrientProfile: true,
            },
          },
        },
      },
    },
  });

  if (!recipe) return null;

  const batch = zeroTotals();
  let totalInputGrams = 0;

  for (const line of recipe.ingredients) {
    const grams = toNumber(line.grams);
    totalInputGrams += grams;
    const factor = grams / 100;
    const p = line.ingredient.nutrientProfile;
    if (!p || factor <= 0) continue;

    batch.caloriesKcal += toNumber(p.caloriesKcal) * factor;
    batch.fatG += toNumber(p.fatG) * factor;
    batch.saturatedG += toNumber(p.saturatedG) * factor;
    batch.transG += toNumber(p.transG) * factor;
    batch.carbsG += toNumber(p.carbsG) * factor;
    batch.fibreG += toNumber(p.fibreG) * factor;
    batch.sugarsG += toNumber(p.sugarsG) * factor;
    batch.proteinG += toNumber(p.proteinG) * factor;
    batch.cholesterolMg += toNumber(p.cholesterolMg) * factor;
    batch.sodiumMg += toNumber(p.sodiumMg) * factor;
    batch.potassiumMg += toNumber(p.potassiumMg) * factor;
    batch.calciumMg += toNumber(p.calciumMg) * factor;
    batch.ironMg += toNumber(p.ironMg) * factor;
    batch.vitaminDmcg += toNumber(p.vitaminDmcg) * factor;
  }

  const roundedBatch = scaleTotals(batch, 1);
  const effectiveYieldG = toNumber(recipe.batchYieldG) > 0 ? toNumber(recipe.batchYieldG) : totalInputGrams;
  const servings = recipe.servingsCount > 0 ? recipe.servingsCount : 1;

  const per100g = effectiveYieldG > 0 ? scaleTotals(batch, 100 / effectiveYieldG) : zeroTotals();
  const perServing = scaleTotals(batch, 1 / servings);

  const servingSizeG = effectiveYieldG / servings;
  const cfiaLabel = generateCfiaLabel(perServing, per100g, {
    servingSizeG: round4(servingSizeG),
    referenceAmountG: 100,
  });

  return {
    recipeId: recipe.id,
    servingsCount: servings,
    totalInputGrams: round4(totalInputGrams),
    effectiveYieldG: round4(effectiveYieldG),
    perBatch: roundedBatch,
    per100g,
    perServing,
    cfiaLabel,
  };
}
