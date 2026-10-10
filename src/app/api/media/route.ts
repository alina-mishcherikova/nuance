import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { db } from '@/db/client';
import { mediaAssets } from '@/db/schema';
import { currentSession } from '@/features/auth/session';
import { storeImage } from '@/features/media/storage';
import { MAX_IMAGE_BYTES, imageSignature } from '@/lib/validation/media';
import {
  applicationRate,
  json,
  failure,
  ApiError,
} from '@/features/quizzes/transport';
export async function POST(request: Request) {
  try {
    if (
      request.headers.get('origin') !==
      new URL(process.env.BETTER_AUTH_URL!).origin
    )
      throw new ApiError('FORBIDDEN', 403);
    const session = await currentSession();
    if (!session) throw new ApiError('UNAUTHORIZED', 401);
    await applicationRate('upload', session.user.id);
    const mime = request.headers.get('content-type') ?? '';
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(mime))
      throw new ApiError('INVALID_IMAGE');
    const reader = request.body?.getReader();
    if (!reader) throw new ApiError('INVALID_IMAGE');
    let total = 0;
    const chunks: Uint8Array[] = [];
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      total += part.value.length;
      if (total > MAX_IMAGE_BYTES) {
        await reader.cancel();
        throw new ApiError('TOO_LARGE', 413);
      }
      chunks.push(part.value);
    }
    const input = Buffer.concat(chunks);
    if (!imageSignature(input, mime)) throw new ApiError('INVALID_IMAGE');
    let bytes: Buffer;
    try {
      bytes = await sharp(input, {
        limitInputPixels: 16_000_000,
        animated: false,
        failOn: 'warning',
      })
        .rotate()
        .resize({
          width: 1600,
          height: 1600,
          fit: 'inside',
          withoutEnlargement: true,
        })
        .webp({ quality: 85 })
        .timeout({ seconds: 10 })
        .toBuffer();
    } catch {
      throw new ApiError('INVALID_IMAGE');
    }
    const key = `images/${randomUUID()}.webp`;
    await storeImage(key, bytes);
    const [asset] = await db
      .insert(mediaAssets)
      .values({
        ownerId: session.user.id,
        storageKey: key,
        mimeType: 'image/webp',
        bytes: bytes.length,
        status: 'READY',
      })
      .returning({ id: mediaAssets.id });
    return json(asset, 201);
  } catch (error) {
    return failure(error);
  }
}
