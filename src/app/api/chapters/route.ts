import { NextResponse } from "next/server";
import { chapters } from "@/lib/db";

export async function GET() {
  const all = await chapters.getAll();
  return NextResponse.json(all);
}
