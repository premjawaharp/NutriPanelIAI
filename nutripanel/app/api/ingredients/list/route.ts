import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const ingredients = await db.ingredient.findMany({
      where: { createdByUserId: userId },
      select: {
        id: true,
        name: true,
        sourceType: true,
        sourceRef: true,
        brandName: true,
        createdAt: true,
        nutrientProfile: {
          select: {
            caloriesKcal: true,
            proteinG: true,
            carbsG: true,
            fatG: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ ingredients });
  } catch (e) {
    console.error("[ingredients/list]", e);
    return NextResponse.json({ error: "Failed to list ingredients" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
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

  const ingredientId =
    typeof body === "object" &&
    body !== null &&
    "ingredientId" in body &&
    typeof (body as { ingredientId: unknown }).ingredientId === "string"
      ? (body as { ingredientId: string }).ingredientId.trim()
      : "";
  const ingredientIds =
    typeof body === "object" &&
    body !== null &&
    "ingredientIds" in body &&
    Array.isArray((body as { ingredientIds: unknown }).ingredientIds)
      ? (body as { ingredientIds: unknown[] }).ingredientIds
          .filter((id): id is string => typeof id === "string")
          .map((id) => id.trim())
          .filter((id) => id.length > 0)
      : [];

  const targets = ingredientIds.length > 0 ? ingredientIds : ingredientId ? [ingredientId] : [];
  if (targets.length === 0) {
    return NextResponse.json(
      { error: "Missing ingredientId or ingredientIds" },
      { status: 400 }
    );
  }

  try {
    const result = await db.ingredient.deleteMany({
      where: { id: { in: targets }, createdByUserId: userId },
    });
    if (result.count === 0) {
      return NextResponse.json(
        { error: "Ingredient not found" },
        { status: 404 }
      );
    }
    return NextResponse.json({
      ok: true,
      deleted: true,
      deletedCount: result.count,
      ingredientIds: targets,
    });
  } catch (e) {
    console.error("[ingredients/list:delete]", e);
    return NextResponse.json(
      { error: "Failed to delete ingredient" },
      { status: 500 }
    );
  }
}
