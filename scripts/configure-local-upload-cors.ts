// Run in the app container: node_modules/.bin/tsx scripts/configure-local-upload-cors.ts
// Explicit local-only setup, not a production R2 provisioning command.
import { PutBucketCorsCommand } from '@aws-sdk/client-s3';
import { createStorageClient } from '../src/lib/storage';
import { getEnv } from '../src/lib/env';

async function main() {
const env = getEnv();
const endpoint = new URL(env.S3_ENDPOINT);
if (process.env.NODE_ENV !== 'development' || !['s3', 'storage', 'localhost', '127.0.0.1'].includes(endpoint.hostname) || endpoint.protocol !== 'http:') {
  throw new Error('Configuração permitida somente no storage local de desenvolvimento');
}
const client = createStorageClient();
try {
  await client.send(new PutBucketCorsCommand({ Bucket: env.S3_BUCKET, CORSConfiguration: { CORSRules: [{
    AllowedOrigins: ['http://admin.localhost:3000'],
    AllowedMethods: ['PUT'], AllowedHeaders: ['content-type', 'x-amz-*'], MaxAgeSeconds: 300,
  }] } }));
  console.log('CORS de upload configurado somente para as origens administrativas locais.');
} finally { client.destroy(); }
}
main().catch(() => { console.error('Não foi possível configurar o CORS local. Verifique o ambiente e a disponibilidade do storage.'); process.exitCode = 1; });
