import { DeleteObjectCommand, ListObjectsV2Command, HeadBucketCommand, S3Client, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { z } from "zod";
import { getEnv } from "./env";

export function createStorageClient() {
  const env = getEnv();
  return new S3Client({
    endpoint: env.S3_ENDPOINT,
    region: env.S3_REGION,
    forcePathStyle: true,
    credentials: { accessKeyId: env.S3_ACCESS_KEY_ID, secretAccessKey: env.S3_SECRET_ACCESS_KEY },
  });
}
export async function checkStorageReady() {
  const client = createStorageClient();
  try { await client.send(new HeadBucketCommand({ Bucket: getEnv().S3_BUCKET }), { abortSignal: AbortSignal.timeout(3000) }); }
  finally { client.destroy(); }
}
// Strict allow-list. Prices, payment identifiers, payer data and admin state cannot enter manifests.
export const publicManifestSchema = z.object({
  version: z.literal(1),
  slug: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
  name: z.string().min(1).max(200),
  endsAt: z.iso.datetime({ offset: true }),
  assets: z.array(z.object({ key: z.string().regex(/^public\/[a-zA-Z0-9/_.-]+$/).refine((v) => !v.includes("..")), contentType: z.enum(["image/png", "image/jpeg", "image/webp", "video/mp4"]) }).strict()).max(100),
}).strict();
export type PublicManifest = z.infer<typeof publicManifestSchema>;
export async function putPrivateObject(key: string, body: Uint8Array, contentType: string) {
  if (!key.startsWith("private/") || key.includes("..")) throw new Error("Invalid private key");
  const client = createStorageClient();
  try { await client.send(new PutObjectCommand({ Bucket: getEnv().S3_BUCKET, Key: key, Body: body, ContentType: contentType })); }
  finally { client.destroy(); }
}
export async function deletePrivateObject(key: string) {
  if (!key.startsWith("private/") || key.includes("..")) throw new Error("Invalid private key");
  const client = createStorageClient();
  try { await client.send(new DeleteObjectCommand({ Bucket: getEnv().S3_BUCKET, Key: key })); }
  finally { client.destroy(); }
}
export type PrivateObjectInfo = { key: string; size?: number; lastModified?: Date };
export async function listPrivateObjects(prefix: string): Promise<PrivateObjectInfo[]> {
  if (!/^private\/campaigns\/[0-9a-f-]{36}\/assets\/$/.test(prefix)) throw new Error("Invalid campaign prefix");
  const client = createStorageClient();
  const objects: PrivateObjectInfo[] = [];
  let token: string | undefined;
  try {
    do {
      const page = await client.send(new ListObjectsV2Command({ Bucket: getEnv().S3_BUCKET, Prefix: prefix, ContinuationToken: token }));
      for (const item of page.Contents ?? []) if (item.Key?.startsWith(prefix)) objects.push({ key: item.Key, size: item.Size, lastModified: item.LastModified });
      if (page.IsTruncated && (!page.NextContinuationToken || page.NextContinuationToken === token)) throw new Error("Incomplete storage listing");
      token = page.IsTruncated ? page.NextContinuationToken : undefined;
    } while (token);
    return objects;
  } finally { client.destroy(); }
}
export async function getPrivateObject(key: string) {
  if (!key.startsWith("private/") || key.includes("..")) throw new Error("Invalid private key");
  const client = createStorageClient();
  try {
    const result = await client.send(new GetObjectCommand({ Bucket: getEnv().S3_BUCKET, Key: key }));
    return { body: await result.Body?.transformToByteArray(), contentType: result.ContentType };
  } finally { client.destroy(); }
}
