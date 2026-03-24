import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getRecipeNutrition } from "@/lib/recipe-nutrition";

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  if (!id || typeof id !== "string") {
    return NextResponse.json({ error: "Missing recipe id" }, { status: 400 });
  }

  try {
    const nutrition = await getRecipeNutrition(id, userId);
    if (!nutrition) {
      return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
    }
    return NextResponse.json({ nutrition });
  } catch (e) {
    console.error("[recipes:nutrition:get]", e);
    return NextResponse.json(
      { error: "Failed to calculate recipe nutrition" },
      { status: 500 }
    );
  }
}
