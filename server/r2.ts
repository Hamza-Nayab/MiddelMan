import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export function getR2Client() {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const endpoint = process.env.R2_ENDPOINT;

  if (!accountId || !accessKeyId || !secretAccessKey || !endpoint) {
    throw new Error(
      "Missing R2 configuration: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_ENDPOINT",
    );
  }

  return new S3Client({
    region: "auto",
    endpoint,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
}

export async function uploadAvatarToR2(
  userId: number,
  buffer: Buffer,
  contentType: string = "image/webp",
): Promise<string> {
  const bucket = process.env.R2_BUCKET;
  const publicBaseUrl = process.env.R2_PUBLIC_BASE_URL;

  if (!bucket || !publicBaseUrl) {
    throw new Error(
      "Missing R2 configuration: R2_BUCKET and R2_PUBLIC_BASE_URL are required",
    );
  }

  const client = getR2Client();
  const key = `avatars/${userId}.webp`;
  const cacheVersion = Date.now();

  try {
    // Upload to R2 with public read permissions via cache headers
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
        CacheControl: "public, max-age=31536000, immutable", // 1 year cache
      }),
    );

    // Return public URL with cache-busting version param
    return `${publicBaseUrl}/${key}?v=${cacheVersion}`;
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unknown error uploading to R2";
    throw new Error(`R2_UPLOAD_FAILED: ${message}`);
  }
}

export async function getR2SignedUploadUrl(
  userId: number,
  expiresIn: number = 3600, // 1 hour
): Promise<string> {
  const bucket = process.env.R2_BUCKET;
  if (!bucket) {
    throw new Error("Missing R2_BUCKET environment variable");
  }
  const client = getR2Client();
  const key = `avatars/${userId}.webp`;

  try {
    const url = await getSignedUrl(
      client,
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        ContentType: "image/webp",
      }),
      { expiresIn },
    );

    return url;
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : "Unknown error generating signed URL";
    throw new Error(`Failed to generate signed upload URL: ${message}`);
  }
}
