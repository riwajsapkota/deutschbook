import { NextResponse } from "next/server";
import { search } from "@/lib/db";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";

  if (q.length < 2) {
    return NextResponse.json({ chapters: [], vocab: [], exercises: [] });
  }

  const results = search(q);
  return NextResponse.json(results);
}
