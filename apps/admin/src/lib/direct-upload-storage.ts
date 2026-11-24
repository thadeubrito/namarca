import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Readable } from "node:stream";
import { CampaignEditorError, MAX_UPLOAD_BYTES } from "./campaign-editor";
import { getEnv } from "./env";
import { createStorageClient, deletePrivateObject } from "./storage";

const TEMPORARY_KEY = /^private\/uploads\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.png$/i;

function assertTemporaryKey(key: string) {
  if (!TEMPORARY_KEY.test(key)) throw new CampaignEditorError(422, "Identificação de envio inválida.");
}

function assertByteLimit(value: number) {
  if (!Number.isSafeInteger(value) || value <= 0) throw new CampaignEditorError(422, "Tamanho de arquivo inválido.");
  if (value > MAX_UPLOAD_BYTES) throw new CampaignEditorError(413, "O arquivo excede o tamanho permitido.");
}

export async function signTemporaryUpload(key: string, byteLength: number): Promise<string> {
  assertTemporaryKey(key);
  assertByteLimit(byteLength);
  const env = getEnv();
  const endpoint = env.S3_UPLOAD_ENDPOINT ?? env.S3_ENDPOINT;
  if (process.env.NODE_ENV === "production" && new URL(endpoint).protocol !== "https:") {
    throw new CampaignEditorError(422, "O armazenamento de envios exige uma conexão segura.");
  }
  const client = new S3Client({
    endpoint,
    region: env.S3_REGION,
    forcePathStyle: true,
    // There is no body at signing time: do not sign the SDK's default CRC32
    // for an empty body. Finalization checks the authorized SHA-256 instead.
    requestChecksumCalculation: 'WHEN_REQUIRED',
    credentials: { accessKeyId: env.S3_ACCESS_KEY_ID, secretAccessKey: env.S3_SECRET_ACCESS_KEY },
  });
  try {
    return await getSignedUrl(client, new PutObjectCommand({
      Bucket: env.S3_BUCKET,
      Key: key,
      ContentType: "image/png",
      ContentLength: byteLength,
    }), { expiresIn: 300, signableHeaders: new Set(["content-type", "content-length"]) });
  } catch {
    throw new CampaignEditorError(422, "Não foi possível preparar o envio. Tente novamente.");
  } finally {
    client.destroy();
  }
}

// The caller must still validate PNG structure, dimensions and the expected hash.
export async function getTemporaryUpload(key: string, maxBytes: number): Promise<Uint8Array> {
  assertTemporaryKey(key);
  assertByteLimit(maxBytes);
  const client = createStorageClient();
  const controller = new AbortController();
  let body: Readable | undefined;
  try {
    const result = await client.send(new GetObjectCommand({ Bucket: getEnv().S3_BUCKET, Key: key }), {
      abortSignal: AbortSignal.any([controller.signal, AbortSignal.timeout(30_000)]),
    });
    if (result.Body instanceof Readable) body = result.Body;
    if (result.ContentType !== "image/png" || !body) {
      throw new CampaignEditorError(422, "O envio deve conter uma imagem PNG válida.");
    }
    if (result.ContentLength !== undefined) {
      if (!Number.isSafeInteger(result.ContentLength) || result.ContentLength < 0) {
        throw new CampaignEditorError(422, "Tamanho de arquivo inválido.");
      }
      if (result.ContentLength > maxBytes) {
        throw new CampaignEditorError(413, "O arquivo excede o tamanho permitido.");
      }
    }
    const chunks: Uint8Array[] = [];
    let total = 0;
    for await (const chunk of body) {
      if (!(chunk instanceof Uint8Array)) throw new CampaignEditorError(422, "Não foi possível ler o envio.");
      if (chunk.byteLength > maxBytes - total) {
        controller.abort();
        throw new CampaignEditorError(413, "O arquivo excede o tamanho permitido.");
      }
      total += chunk.byteLength;
      chunks.push(chunk);
    }
    if (total === 0 || (result.ContentLength !== undefined && total !== result.ContentLength)) {
      throw new CampaignEditorError(422, "O envio está incompleto. Envie o arquivo novamente.");
    }
    const bytes = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return bytes;
  } catch (error) {
    if (error instanceof CampaignEditorError) throw error;
    throw new CampaignEditorError(422, "Não foi possível ler o envio. Envie o arquivo novamente.");
  } finally {
    controller.abort();
    body?.destroy();
    client.destroy();
  }
}

export async function deleteTemporaryUpload(key: string): Promise<void> {
  assertTemporaryKey(key);
  try { await deletePrivateObject(key); } catch { /* Best-effort: never log storage errors or signed URLs. */ }
}
