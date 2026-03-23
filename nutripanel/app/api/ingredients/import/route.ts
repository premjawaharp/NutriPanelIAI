import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { IngredientSourceType } from "@/app/generated/prisma/enums";
import { db } from "@/lib/db";

type UsdaNutrient = {
  nutrient?: {
    name?: string;
    number?: string | number;
  };
  amount?: number | string | null;
  value?: number | string | null;
  nutrientName?: string;
  nutrientNumber?: string | number;
};

type UsdaFoodDetails = {
  fdcId?: number;
  description?: string;
  brandOwner?: string | null;
  foodNutrients?: UsdaNutrient[];
};

function asNumber(value: number | string | null | undefined): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function nutrientValue(
  nutrients: UsdaNutrient[] | undefined,
  opts: { names?: string[]; numbers?: string[] }
): number {
  if (!nutrients || nutrients.length === 0) return 0;

  const byNumber = (opts.numbers ?? []).map((n) => String(n).toLowerCase());
  const byName = (opts.names ?? []).map((n) => n.toLowerCase());

  for (const nutrient of nutrients) {
    const number = String(
      nutrient.nutrient?.number ?? nutrient.nutrientNumber ?? ""
    ).toLowerCase();
    const name = (
      nutrient.nutrient?.name ??
      nutrient.nutrientName ??
      ""
    ).toLowerCase();

    if (
      (number && byNumber.includes(number)) ||
      (name && byName.includes(name))
    ) {
      return asNumber(nutrient.amount ?? nutrient.value);
    }
  }

  return 0;
}

async function fetchUsdaFood(fdcId: number): Promise<UsdaFoodDetails> {
  const apiKey = process.env.USDA_API_KEY;
  if (!apiKey) {
    throw new Error("Missing USDA_API_KEY");
  }

  const res = await fetch(`https://api.nal.usda.gov/fdc/v1/food/${fdcId}?api_key=${apiKey}`, {
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`USDA detail failed with status ${res.status}`);
  }

  return (await res.json()) as UsdaFoodDetails;
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

  const rawFdcId =
    typeof body === "object" && body !== null && "fdcId" in body
      ? (body as { fdcId: unknown }).fdcId
      : undefined;
  const fdcId = typeof rawFdcId === "number" ? rawFdcId : Number(rawFdcId);

  if (!Number.isInteger(fdcId) || fdcId <= 0) {
    return NextResponse.json({ error: "Invalid fdcId" }, { status: 400 });
  }

  try {
    const food = await fetchUsdaFood(fdcId);
    const nutrients = food.foodNutrients ?? [];
    const name = (food.description ?? "").trim() || `USDA Ingredient ${fdcId}`;

    const sourceRef = String(fdcId);
    const nutrientData = {
      caloriesKcal: nutrientValue(nutrients, {
        numbers: ["208"],
        names: ["Energy"],
      }),
      fatG: nutrientValue(nutrients, {
        numbers: ["204"],
        names: ["Total lipid (fat)", "Total fat"],
      }),
      saturatedG: nutrientValue(nutrients, {
        numbers: ["606"],
        names: ["Fatty acids, total saturated"],
      }),
      transG: nutrientValue(nutrients, {
        numbers: ["605"],
        names: ["Fatty acids, total trans"],
      }),
      carbsG: nutrientValue(nutrients, {
        numbers: ["205"],
        names: ["Carbohydrate, by difference"],
      }),
      fibreG: nutrientValue(nutrients, {
        numbers: ["291"],
        names: ["Fiber, total dietary", "Fibre, total dietary"],
      }),
      sugarsG: nutrientValue(nutrients, {
        numbers: ["269"],
        names: ["Sugars, total including NLEA", "Sugars, total"],
      }),
      proteinG: nutrientValue(nutrients, {
        numbers: ["203"],
        names: ["Protein"],
      }),
      cholesterolMg: nutrientValue(nutrients, {
        numbers: ["601"],
        names: ["Cholesterol"],
      }),
      sodiumMg: nutrientValue(nutrients, {
        numbers: ["307"],
        names: ["Sodium, Na"],
      }),
      potassiumMg: nutrientValue(nutrients, {
        numbers: ["306"],
        names: ["Potassium, K"],
      }),
      calciumMg: nutrientValue(nutrients, {
        numbers: ["301"],
        names: ["Calcium, Ca"],
      }),
      ironMg: nutrientValue(nutrients, {
        numbers: ["303"],
        names: ["Iron, Fe"],
      }),
      vitaminDmcg: nutrientValue(nutrients, {
        numbers: ["328"],
        names: ["Vitamin D (D2 + D3)", "Vitamin D"],
      }),
    };

    const existing = await db.ingredient.findFirst({
      where: {
        createdByUserId: userId,
        sourceType: IngredientSourceType.USDA,
        sourceRef,
      },
      select: { id: true, sourceRef: true },
      orderBy: { createdAt: "asc" },
    });

    const ingredient = existing
      ? await db.ingredient.update({
          where: { id: existing.id },
          data: {
            name,
            brandName: food.brandOwner ?? null,
            nutrientProfile: {
              upsert: {
                create: nutrientData,
                update: nutrientData,
              },
            },
          },
          select: { id: true, sourceRef: true },
        })
      : await db.ingredient.create({
          data: {
            name,
            sourceType: IngredientSourceType.USDA,
            sourceRef,
            brandName: food.brandOwner ?? null,
            createdByUserId: userId,
            nutrientProfile: {
              create: nutrientData,
            },
          },
          select: { id: true, sourceRef: true },
        });

    return NextResponse.json({
      ok: true,
      ingredientId: ingredient.id,
      sourceRef: ingredient.sourceRef,
      updatedExisting: Boolean(existing),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Import failed";
    console.error("[ingredients/import]", message);
    const status = message === "Missing USDA_API_KEY" ? 503 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
