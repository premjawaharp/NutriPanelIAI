"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CfiaNutritionFactsTable } from "@/components/CfiaNutritionFactsTable";

type IngredientRow = {
  id: string;
  name: string;
  sourceType: string;
  sourceRef: string | null;
};

type SelectedIngredient = {
  ingredientId: string;
  name: string;
  grams: string;
};

type NutritionTotals = {
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

type CfiaRoundedNutrients = {
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

type CfiaDailyValuePercent = {
  fat: number;
  saturatedPlusTrans: number;
  fibre: number;
  sugars: number;
  sodium: number;
  potassium: number;
  calcium: number;
  iron: number;
};

type CfiaLabel = {
  perServing: CfiaRoundedNutrients;
  per100g: CfiaRoundedNutrients;
  dailyValuePercent: CfiaDailyValuePercent;
  servingSizeG: number;
  referenceAmountG: number;
};

type RecipeNutrition = {
  recipeId: string;
  servingsCount: number;
  totalInputGrams: number;
  effectiveYieldG: number;
  perBatch: NutritionTotals;
  per100g: NutritionTotals;
  perServing: NutritionTotals;
  cfiaLabel?: CfiaLabel;
};

function getErrorMessage(err: unknown, fallback: string): string {
  return err instanceof Error && err.message ? err.message : fallback;
}

export default function NewRecipePage() {
  const [name, setName] = useState("");
  const [servingsCount, setServingsCount] = useState("1");
  const [batchYieldG, setBatchYieldG] = useState("");
  const [ingredients, setIngredients] = useState<SelectedIngredient[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [nutrition, setNutrition] = useState<RecipeNutrition | null>(null);

  const searchParams = useSearchParams();
  const ingredientIdsFromQuery = useMemo(() => {
    const raw = searchParams.get("ingredientIds") ?? "";
    return raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }, [searchParams]);

  useEffect(() => {
    async function hydrate() {
      const fromStorageRaw = sessionStorage.getItem("np:selectedIngredientIds");
      let fromStorage: string[] = [];
      if (fromStorageRaw && fromStorageRaw.length > 0) {
        try {
          const parsed: unknown = JSON.parse(fromStorageRaw);
          fromStorage = Array.isArray(parsed)
            ? parsed.filter((x): x is string => typeof x === "string" && x.trim().length > 0)
            : [];
        } catch {
          fromStorage = [];
        }
      }
      const ids =
        ingredientIdsFromQuery.length > 0 ? ingredientIdsFromQuery : fromStorage;
      if (ids.length === 0) return;

      const res = await fetch("/api/ingredients/list", {
        cache: "no-store",
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) return;
      const rows = Array.isArray(data.ingredients) ? (data.ingredients as IngredientRow[]) : [];
      const picked = rows
        .filter((x) => ids.includes(x.id))
        .map((x) => ({
          ingredientId: x.id,
          name: x.name,
          grams: "100",
        }));
      setIngredients(picked);
    }
    void hydrate();
  }, [ingredientIdsFromQuery]);

  function updateGrams(ingredientId: string, grams: string) {
    setIngredients((prev) =>
      prev.map((x) => (x.ingredientId === ingredientId ? { ...x, grams } : x))
    );
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setNutrition(null);
    if (!name.trim()) {
      setError("Recipe name is required.");
      return;
    }
    if (ingredients.length === 0) {
      setError("Select at least one ingredient from the ingredients page.");
      return;
    }

    const payload = {
      name: name.trim(),
      servingsCount: Number(servingsCount || "1"),
      batchYieldG: batchYieldG ? Number(batchYieldG) : null,
      ingredients: ingredients.map((x) => ({
        ingredientId: x.ingredientId,
        grams: Number(x.grams),
      })),
    };

    setLoading(true);
    try {
      const res = await fetch("/api/recipes", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create recipe");
      }
      setSuccess(`Recipe created: ${data.recipe?.name ?? "Untitled"}`);
      setNutrition((data.nutrition as RecipeNutrition) ?? null);
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Failed to create recipe"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen p-10 bg-gray-50">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900">Recipe Builder</h1>
        <p className="mt-2 text-gray-600">
          Define recipe metadata and grams per selected ingredient.
        </p>

        <form onSubmit={handleCreate} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Recipe name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
              placeholder="e.g. Ginger Turmeric Blend"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700">Servings count</label>
              <input
                type="number"
                min={1}
                value={servingsCount}
                onChange={(e) => setServingsCount(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Total yield (g)</label>
              <input
                type="number"
                min={1}
                value={batchYieldG}
                onChange={(e) => setBatchYieldG(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                placeholder="optional"
              />
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="text-sm font-medium text-gray-700">Ingredients (grams)</p>
            {ingredients.length === 0 ? (
              <p className="mt-2 text-sm text-gray-500">
                No pre-selected ingredients. Go back and select ingredients first.
              </p>
            ) : (
              <div className="mt-3 space-y-2">
                {ingredients.map((item) => (
                  <div key={item.ingredientId} className="flex items-center justify-between gap-3">
                    <p className="text-sm text-gray-800">{item.name}</p>
                    <input
                      type="number"
                      min={1}
                      value={item.grams}
                      onChange={(e) => updateGrams(item.ingredientId, e.target.value)}
                      className="w-28 rounded-md border border-gray-300 px-2 py-1 text-sm"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {error && <p className="text-red-600 text-sm">{error}</p>}
          {success && <p className="text-green-700 text-sm">{success}</p>}

          {nutrition && (
            <div className="rounded-xl border border-green-200 bg-green-50 p-4">
              <p className="text-sm font-semibold text-green-900">
                Nutrition calculated
              </p>
              <p className="mt-1 text-xs text-green-800">
                Yield: {nutrition.effectiveYieldG} g · Servings: {nutrition.servingsCount}
              </p>
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="rounded-md bg-white p-2 border border-green-100">
                  <p className="font-medium text-gray-800">Per batch</p>
                  <p>Calories: {nutrition.perBatch.caloriesKcal}</p>
                  <p>Protein: {nutrition.perBatch.proteinG} g</p>
                  <p>Carbs: {nutrition.perBatch.carbsG} g</p>
                  <p>Fat: {nutrition.perBatch.fatG} g</p>
                </div>
                <div className="rounded-md bg-white p-2 border border-green-100">
                  <p className="font-medium text-gray-800">Per 100g</p>
                  <p>Calories: {nutrition.per100g.caloriesKcal}</p>
                  <p>Protein: {nutrition.per100g.proteinG} g</p>
                  <p>Carbs: {nutrition.per100g.carbsG} g</p>
                  <p>Fat: {nutrition.per100g.fatG} g</p>
                </div>
                <div className="rounded-md bg-white p-2 border border-green-100">
                  <p className="font-medium text-gray-800">Per serving</p>
                  <p>Calories: {nutrition.perServing.caloriesKcal}</p>
                  <p>Protein: {nutrition.perServing.proteinG} g</p>
                  <p>Carbs: {nutrition.perServing.carbsG} g</p>
                  <p>Fat: {nutrition.perServing.fatG} g</p>
                </div>
              </div>
              {nutrition.cfiaLabel && (
                <div className="mt-4">
                  <CfiaNutritionFactsTable label={nutrition.cfiaLabel} />
                </div>
              )}
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-black px-4 py-2 text-white disabled:opacity-50"
            >
              {loading ? "Creating..." : "Create recipe"}
            </button>
            <Link
              href="/dashboard/ingredients"
              className="rounded-lg border border-gray-300 px-4 py-2 text-gray-700"
            >
              Back to Ingredients
            </Link>
          </div>
        </form>
      </div>
    </main>
  );
}
