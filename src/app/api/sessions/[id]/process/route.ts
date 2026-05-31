import { NextResponse } from "next/server";
import { sessions } from "@/lib/db";
import { processSession } from "@/lib/process-session";

export const maxDuration = 300;

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await sessions.getById(id);
  if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });

  // Run async — return immediately, client can poll session status
  processSession(id).catch((err) => {
    console.error("processSession error:", err);
    sessions.updateStatus(id, "partially_processed");
  });

  return NextResponse.json({ message: "Processing started", sessionId: id });
}
