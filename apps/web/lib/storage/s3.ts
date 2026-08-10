/**
 * AWS S3 storage for client media (before/after photos). Objects are private;
 * reads are served via short-lived presigned GET URLs. Credentials come from the
 * standard AWS env vars (AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY) or the
 * ambient provider chain (IAM role) when those are absent.
 */
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

let client: S3Client | null = null;

function getClient(): S3Client {
  if (client) return client;
  const region = process.env.AWS_REGION || 'eu-west-1';
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  client = new S3Client({
    region,
    // Pass explicit creds when provided; otherwise fall back to the default chain.
    ...(accessKeyId && secretAccessKey
      ? { credentials: { accessKeyId, secretAccessKey } }
      : {}),
  });
  return client;
}

function bucket(): string {
  const name = process.env.AWS_S3_BUCKET;
  if (!name) throw new Error('AWS_S3_BUCKET is not configured.');
  return name;
}

/** Optional prefix so client media can share a bucket with other data. */
function keyFor(path: string): string {
  const prefix = process.env.AWS_S3_PREFIX?.replace(/^\/+|\/+$/g, '');
  return prefix ? `${prefix}/${path}` : path;
}

export async function putObject(path: string, bytes: Buffer, contentType: string): Promise<void> {
  await getClient().send(
    new PutObjectCommand({
      Bucket: bucket(),
      Key: keyFor(path),
      Body: bytes,
      ContentType: contentType,
      CacheControl: 'private, max-age=3600',
    })
  );
}

export async function getSignedReadUrl(path: string, ttlSeconds: number): Promise<string> {
  return getSignedUrl(
    getClient(),
    new GetObjectCommand({ Bucket: bucket(), Key: keyFor(path) }),
    { expiresIn: ttlSeconds }
  );
}

export async function deleteObject(path: string): Promise<void> {
  await getClient().send(new DeleteObjectCommand({ Bucket: bucket(), Key: keyFor(path) }));
}
