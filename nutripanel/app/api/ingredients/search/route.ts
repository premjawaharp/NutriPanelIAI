import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { searchUsdaFoods } from "@/lib/usda";

type UsdaFoodItem = {
  fdcId: number;
  description?: string;
  dataType?: string;
  brandOwner?: string | null;
};

/**
 * POST /api/ingredients/search
 * Body: { query: string }
 * Proxies USDA FDC search (server-side key).
 */
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

  const query =
    typeof body === "object" &&
    body !== null &&
    "query" in body &&
    typeof (body as { query: unknown }).query === "string"
      ? (body as { query: string }).query.trim()
      : "";

  if (!query) {
    return NextResponse.json(
      { error: "Missing or empty query" },
      { status: 400 }
    );
  }

  try {
    const raw = (await searchUsdaFoods(query)) as {
      foods?: UsdaFoodItem[];
    };
    const foods = Array.isArray(raw.foods) ? raw.foods : [];
    const results = foods.map((f) => ({
      fdcId: f.fdcId,
      description: f.description ?? "",
      dataType: f.dataType ?? "",
      brandOwner: f.brandOwner ?? null,
    }));

    return NextResponse.json({ results });
  } catch (e) {
    const message = e instanceof Error ? e.message : "USDA search failed";
    const status =
      message === "Missing USDA_API_KEY" ? 503 : 502;
    console.error("[ingredients/search]", message);
    return NextResponse.json({ error: message }, { status });
  }
}
