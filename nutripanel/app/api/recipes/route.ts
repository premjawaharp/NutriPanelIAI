import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getRecipeNutrition } from "@/lib/recipe-nutrition";

type RecipeInputItem = {
  ingredientId: string;
  grams: number;
};

function toPositiveNumber(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const recipes = await db.recipe.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: {
        ingredients: {
          include: {
            ingredient: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });
    const withNutrition = await Promise.all(
      recipes.map(async (recipe) => ({
        ...recipe,
        nutrition: await getRecipeNutrition(recipe.id, userId),
      }))
    );
    return NextResponse.json({ recipes: withNutrition });
  } catch (e) {
    console.error("[recipes:get]", e);
    return NextResponse.json({ error: "Failed to list recipes" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const name =
    typeof body === "object" &&
    body !== null &&
    "name" in body &&
    typeof (body as { name: unknown }).name === "string"
      ? (body as { name: string }).name.trim()
      : "";
  const servingsCountRaw =
    typeof body === "object" && body !== null && "servingsCount" in body
      ? (body as { servingsCount: unknown }).servingsCount
      : 1;
  const batchYieldGRaw =
    typeof body === "object" && body !== null && "batchYieldG" in body
      ? (body as { batchYieldG: unknown }).batchYieldG
      : null;
  const items =
    typeof body === "object" &&
    body !== null &&
    "ingredients" in body &&
    Array.isArray((body as { ingredients: unknown }).ingredients)
      ? (body as { ingredients: RecipeInputItem[] }).ingredients
      : [];

  if (!name) {
    return NextResponse.json({ error: "Recipe name is required" }, { status: 400 });
  }
  if (items.length === 0) {
    return NextResponse.json({ error: "At least one ingredient is required" }, { status: 400 });
  }

  const servingsCount = Math.max(1, Math.floor(toPositiveNumber(servingsCountRaw) || 1));
  const batchYieldG = toPositiveNumber(batchYieldGRaw);

  const normalizedItems = items
    .map((x) => ({
      ingredientId: typeof x?.ingredientId === "string" ? x.ingredientId.trim() : "",
      grams: toPositiveNumber(x?.grams),
    }))
    .filter((x) => x.ingredientId && x.grams > 0);

  if (normalizedItems.length === 0) {
    return NextResponse.json(
      { error: "Each recipe ingredient must have a valid ingredientId and grams > 0" },
      { status: 400 }
    );
  }

  // Deduplicate by ingredientId (keep the last provided grams).
  const dedupMap = new Map<string, number>();
  for (const item of normalizedItems) dedupMap.set(item.ingredientId, item.grams);
  const dedupedItems = [...dedupMap.entries()].map(([ingredientId, grams]) => ({
    ingredientId,
    grams,
  }));

  try {
    const ownedIngredients = await db.ingredient.findMany({
      where: {
        createdByUserId: userId,
        id: { in: dedupedItems.map((x) => x.ingredientId) },
      },
      select: { id: true },
    });
    const ownedSet = new Set(ownedIngredients.map((x) => x.id));
    const unowned = dedupedItems.find((x) => !ownedSet.has(x.ingredientId));
    if (unowned) {
      return NextResponse.json(
        { error: "One or more ingredients are not accessible for this user" },
        { status: 403 }
      );
    }

    const recipe = await db.recipe.create({
      data: {
        userId,
        name,
        servingsCount,
        batchYieldG: batchYieldG > 0 ? batchYieldG : null,
        ingredients: {
          create: dedupedItems.map((x) => ({
            ingredientId: x.ingredientId,
            grams: x.grams,
          })),
        },
      },
      include: {
        ingredients: {
          include: {
            ingredient: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    const nutrition = await getRecipeNutrition(recipe.id, userId);
    return NextResponse.json({ ok: true, recipe, nutrition }, { status: 201 });
  } catch (e) {
    console.error("[recipes:create]", e);
    return NextResponse.json({ error: "Failed to create recipe" }, { status: 500 });
  }
}
