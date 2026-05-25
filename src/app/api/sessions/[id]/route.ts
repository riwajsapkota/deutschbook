import { NextResponse } from "next/server";
import { sessions, materials } from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = sessions.getById(id);
  if (!session) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const mats = materials.getBySession(id);
  return NextResponse.json({ ...session, materials: mats });
}
