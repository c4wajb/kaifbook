import crypto from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { ApiError, handleApiError, ok, requireAuth } from "@/lib/api";
import { requireRestaurantAccess } from "@/lib/permissions";
import sharp from "sharp";

export const runtime = "nodejs";

type Context = { params: Promise<{ restaurantId: string }> };

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_FILES = 12;
const MAX_DIMENSION = 1920;
const WEBP_QUALITY = 82;

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
]);

function getFiles(formData: FormData) {
  const files = [...formData.getAll("file"), ...formData.getAll("files")].filter(
    (value): value is File => value instanceof File && value.size > 0,
  );

  if (files.length === 0) {
    throw new ApiError(400, "Выберите изображение для загрузки.");
  }

  if (files.length > MAX_FILES) {
    throw new ApiError(400, `За один раз можно загрузить не больше ${MAX_FILES} изображений.`);
  }

  return files;
}

async function optimizeImage(buffer: Buffer): Promise<Buffer> {
  return sharp(buffer)
    .rotate()
    .resize(MAX_DIMENSION, MAX_DIMENSION, {
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: WEBP_QUALITY })
    .toBuffer();
}

export async function POST(request: Request, context: Context) {
  try {
    const { restaurantId } = await context.params;
    const user = await requireAuth();
    await requireRestaurantAccess(user, restaurantId);

    const formData = await request.formData();
    const files = getFiles(formData);
    const uploadDir = path.join(process.cwd(), "public", "uploads", "restaurants", restaurantId);

    await mkdir(uploadDir, { recursive: true });

    const urls = await Promise.all(
      files.map(async (file) => {
        if (file.size > MAX_FILE_SIZE) {
          throw new ApiError(400, "Файл слишком большой. Максимальный размер — 5 МБ.");
        }

        if (!ALLOWED_MIME_TYPES.has(file.type)) {
          throw new ApiError(400, "Загрузите изображение в формате JPG, PNG, WEBP или AVIF.");
        }

        const rawBuffer = Buffer.from(await file.arrayBuffer());
        const optimized = await optimizeImage(rawBuffer);

        const fileName = `image-${Date.now()}-${crypto.randomUUID()}.webp`;
        const filePath = path.join(uploadDir, fileName);

        await writeFile(filePath, optimized);

        return `/uploads/restaurants/${restaurantId}/${fileName}`;
      }),
    );

    return ok({ url: urls[0], urls }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
