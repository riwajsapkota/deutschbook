import path from "path";
import fs from "fs";

export function detectFileType(
  filename: string
): "pdf" | "audio" | "excel" | "image" | "text" {
  const ext = path.extname(filename).toLowerCase();
  if (ext === ".pdf") return "pdf";
  if ([".mp3", ".m4a", ".wav", ".ogg", ".aac"].includes(ext)) return "audio";
  if ([".xls", ".xlsx", ".csv"].includes(ext)) return "excel";
  if ([".jpg", ".jpeg", ".png", ".gif", ".webp"].includes(ext)) return "image";
  return "text"; // includes .txt, .md, .html, .htm
}

export async function extractTextFromFile(filePath: string): Promise<string> {
  const ext = path.extname(filePath).toLowerCase();

  if (ext === ".pdf") {
    return extractFromPdf(filePath);
  }

  if ([".xls", ".xlsx"].includes(ext)) {
    return extractFromExcel(filePath);
  }

  if (ext === ".csv") {
    return fs.readFileSync(filePath, "utf-8");
  }

  if ([".txt", ".md"].includes(ext)) {
    return fs.readFileSync(filePath, "utf-8");
  }

  if ([".html", ".htm"].includes(ext)) {
    const html = fs.readFileSync(filePath, "utf-8");
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
  const buffer = fs.readFileSync(filePath);
  const data = await pdfParse(buffer);
  return data.text as string;
}

async function extractFromExcel(filePath: string): Promise<string> {
  const XLSX = await import("xlsx");
  const workbook = XLSX.readFile(filePath);
  const lines: string[] = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const csv = XLSX.utils.sheet_to_csv(sheet);
    lines.push(`=== Sheet: ${sheetName} ===`);
    lines.push(csv);
  }

  return lines.join("\n");
}
