/**
 * Private object storage for chat attachments (Cloudflare R2, S3-compatible).
 *
 * Objects are never public. Uploads use short-lived signed PUT URLs scoped to
 * one key, content type and size; downloads use 60-second signed GET URLs that
 * are only handed out after a permission check (see /api/attachments/[id]).
 *
 * Server-only module: it reads storage credentials and must not be imported by
 * client components.
 */

import { GetObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const UPLOAD_URL_TTL_SECONDS = 5 * 60;
const DOWNLOAD_URL_TTL_SECONDS = 60;

type StorageConfig = { endpoint: string; bucket: string; accessKeyId: string; secretAccessKey: string; pathStyle: boolean };

function getConfig(): StorageConfig | null {
  const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_ENDPOINT } = process.env;
  if (!R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET) return null;
  // R2_ENDPOINT overrides the R2 URL (any S3-compatible service, or a local emulator for tests).
  const endpoint = R2_ENDPOINT || (R2_ACCOUNT_ID ? `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com` : '');
  if (!endpoint) return null;
  return { endpoint, bucket: R2_BUCKET, accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY, pathStyle: !!R2_ENDPOINT };
}

export const isStorageConfigured = () => getConfig() !== null;

let cached: { client: S3Client; bucket: string } | null = null;

function storage() {
  if (cached) return cached;
  const config = getConfig();
  if (!config) throw new Error('Attachment storage is not configured (R2_* environment variables).');
  cached = {
    bucket: config.bucket,
    client: new S3Client({
      region: 'auto',
      endpoint: config.endpoint,
      forcePathStyle: config.pathStyle,
      credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey },
    }),
  };
  return cached;
}

/** Signed URL that only accepts a PUT of exactly this content type and size. */
export async function createUploadUrl(key: string, mimeType: string, size: number): Promise<string> {
  const { client, bucket } = storage();
  return getSignedUrl(client, new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: mimeType, ContentLength: size }), {
    expiresIn: UPLOAD_URL_TTL_SECONDS,
    signableHeaders: new Set(['content-type', 'content-length']),
  });
}

/** Size of the stored object in bytes, or null if it doesn't exist. */
export async function getObjectSize(key: string): Promise<number | null> {
  const { client, bucket } = storage();
  try {
    const head = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return head.ContentLength ?? null;
  } catch {
    return null;
  }
}

/** Short-lived download URL with the content type and file name forced by us, not by the uploader. */
export async function createDownloadUrl(
  key: string,
  { fileName, mimeType, inline }: { fileName: string; mimeType: string; inline: boolean },
): Promise<string> {
  const { client, bucket } = storage();
  const encoded = encodeURIComponent(fileName);
  const disposition = `${inline ? 'inline' : 'attachment'}; filename="${encoded}"; filename*=UTF-8''${encoded}`;
  return getSignedUrl(
    client,
    new GetObjectCommand({ Bucket: bucket, Key: key, ResponseContentType: mimeType, ResponseContentDisposition: disposition }),
    { expiresIn: DOWNLOAD_URL_TTL_SECONDS },
  );
}
