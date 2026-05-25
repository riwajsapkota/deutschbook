import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { sessions } from "@/lib/db";

export async function GET() {
  const all = sessions.getAll();
  return NextResponse.json(all);
}

export async function POST(request: Request) {
  const body = await request.json();
  const { date, lecture_number, raw_notes } = body;

  if (!date) {
    return NextResponse.json({ error: "date is required" }, { status: 400 });
  }

  const id = randomUUID();
  sessions.create({ id, date, lecture_number: lecture_number ?? null, raw_notes: raw_notes ?? null });

  const created = sessions.getById(id);
  return NextResponse.json(created, { status: 201 });
}
