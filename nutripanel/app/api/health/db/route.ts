import { NextResponse } from "next/server";

export async function GET() {
  try {
    const { db } = await import("@/lib/db");
    await db.$queryRaw`SELECT 1`;
    return NextResponse.json({ ok: true, database: "connected" });
  } catch (error) {
    console.error("DB health check failed", error);
    return NextResponse.json(
      { ok: false, database: "disconnected" },
      { status: 500 }
    );
  }
}