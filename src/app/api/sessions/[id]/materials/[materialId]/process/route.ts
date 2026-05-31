import { NextResponse } from "next/server";
import { sessions } from "@/lib/db";
import { retryMaterial } from "@/lib/process-session";

export const maxDuration = 300;

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string; materialId: string }> }
) {
  const { id, materialId } = await params;
  const session = await sessions.getById(id);
  if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });

  retryMaterial(id, materialId).catch((err) => {
    console.error("retryMaterial error:", err);
  });

  return NextResponse.json({ message: "Retry started", materialId });
}
