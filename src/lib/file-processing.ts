import path from "path";
import fs from "fs";
import Anthropic from "@anthropic-ai/sdk";

export function detectFileType(
  filename: string
): "pdf" | "audio" | "excel" | "word" | "image" | "text" {
  const ext = path.extname(filename).toLowerCase();
  if (ext === ".pdf") return "pdf";
  if ([".mp3", ".m4a", ".wav", ".ogg", ".aac"].includes(ext)) return "audio";
  if ([".xls", ".xlsx", ".csv"].includes(ext)) return "excel";
  if ([".doc", ".docx"].includes(ext)) return "word";
  if ([".jpg", ".jpeg", ".png", ".gif", ".webp"].includes(ext)) return "image";
  return "text"; // includes .txt, .md, .html, .htm
}

async function readFileBytes(filePath: string): Promise<Buffer> {
  if (filePath.startsWith("http://") || filePath.startsWith("https://")) {
    const res = await fetch(filePath);
    return Buffer.from(await res.arrayBuffer());
  }
  return fs.readFileSync(filePath);
}

async function readFileText(filePath: string): Promise<string> {
  if (filePath.startsWith("http://") || filePath.startsWith("https://")) {
    const res = await fetch(filePath);
    return res.text();
  }
  return fs.readFileSync(filePath, "utf-8");
}

export async function extractTextFromFile(filePath: string): Promise<string> {
  // For URL paths, derive extension from the URL pathname before the query string
  const urlPath = filePath.startsWith("http") ? new URL(filePath).pathname : filePath;
  const ext = path.extname(urlPath).toLowerCase();

  if (ext === ".pdf") {
    return extractFromPdf(filePath);
  }

  if ([".xls", ".xlsx"].includes(ext)) {
    return extractFromExcel(filePath);
  }

  if ([".doc", ".docx"].includes(ext)) {
    return extractFromWord(filePath);
  }

  if (ext === ".csv") {
    return readFileText(filePath);
  }

  if ([".txt", ".md"].includes(ext)) {
    return readFileText(filePath);
  }

  if ([".html", ".htm"].includes(ext)) {
    const html = await readFileText(filePath);
    // Strip HTML tags and decode basic entities
    return html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n")
      .replace(/<\/div>/gi, "\n")
      .replace(/<\/li>/gi, "\n")
      .replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  return "";
}

async function extractFromPdf(filePath: string): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfParse = require("pdf-parse");
  const buffer = await readFileBytes(filePath);
  const data = await pdfParse(buffer);
  const text = data.text as string;
  if (text.trim()) return text;
  // Scanned PDF with no text layer — fall back to Claude Vision OCR
  return extractFromPdfViaVision(filePath);
}

async function extractFromPdfViaVision(filePath: string): Promise<string> {
  if (process.env.MOCK_AI === "true") return "[Mock OCR text for scanned PDF]";
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const buffer = await readFileBytes(filePath);
  const base64 = buffer.toString("base64");
  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 4096,
    messages: [{
      role: "user",
      content: [
        {
          type: "document",
          source: { type: "base64", media_type: "application/pdf", data: base64 },
        },
        {
          type: "text",
          text: "Extract all text from this document verbatim, preserving structure and layout. Return only the extracted text, nothing else.",
        },
      ],
    }],
  });
  return response.content[0].type === "text" ? response.content[0].text : "";
}

async function extractFromWord(filePath: string): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mammoth = require("mammoth");
  const buffer = await readFileBytes(filePath);
  const result = await mammoth.extractRawText({ buffer });
  return result.value as string;
}

async function extractFromExcel(filePath: string): Promise<string> {
  const XLSX = await import("xlsx");
  const buffer = await readFileBytes(filePath);
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const lines: string[] = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const csv = XLSX.utils.sheet_to_csv(sheet);
    lines.push(`=== Sheet: ${sheetName} ===`);
    lines.push(csv);
  }

  return lines.join("\n");
}
