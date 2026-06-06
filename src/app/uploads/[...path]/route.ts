import { readFile, stat } from "node:fs/promises";
import path from "node:path";

import { NextResponse } from "next/server";

export const runtime = "nodejs";

type Context = { params: Promise<{ path: string[] }> };

const CONTENT_TYPES: Record<string, string> = {
  ".avif": "image/avif",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

function getSafeUploadPath(parts: string[]) {
  if (!parts.length || parts.some((part) => part === ".." || part.includes("/") || part.includes("\\"))) {
    return null;
  }

  const baseDir = path.join(process.cwd(), "public", "uploads");
  const filePath = path.join(baseDir, ...parts);
  const relative = path.relative(baseDir, filePath);

  if (relative.startsWith("..") || path.isAbsolute(relative)) return null;

  return filePath;
}

export async function GET(_request: Request, context: Context) {
  const { path: parts } = await context.params;
  const filePath = getSafeUploadPath(parts);

  if (!filePath) {
    return new NextResponse("Not found", { status: 404 });
  }

  const extension = path.extname(filePath).toLowerCase();
  const contentType = CONTENT_TYPES[extension];

  if (!contentType) {
    return new NextResponse("Not found", { status: 404 });
  }

  try {
    const fileStat = await stat(filePath);
    if (!fileStat.isFile()) {
      return new NextResponse("Not found", { status: 404 });
    }

    const file = await readFile(filePath);

    return new NextResponse(file, {
      headers: {
        "Cache-Control": "public, max-age=31536000, immutable",
        "Content-Length": String(file.length),
        "Content-Type": contentType,
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
