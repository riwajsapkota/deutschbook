import { NextResponse } from "next/server";
import { vocabulary } from "@/lib/db";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { word, article, plural, translation, example_sentence, part_of_speech, tags } = body;

  await vocabulary.update(id, {
    ...(word !== undefined && { word }),
    ...("article" in body && { article }),
    ...("plural" in body && { plural }),
    ...(translation !== undefined && { translation }),
    ...(example_sentence !== undefined && { example_sentence }),
    ...(part_of_speech !== undefined && { part_of_speech }),
    ...(tags !== undefined && { tags }),
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await vocabulary.delete(id);
  return NextResponse.json({ ok: true });
}
