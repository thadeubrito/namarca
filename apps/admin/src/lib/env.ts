import { z } from "zod";

// Parse on demand: importing a module during `next build` must not require runtime secrets.
const schema = z.object({
  DATABASE_URL: z.string().min(1),
  S3_ENDPOINT: z.url().default("http://storage:9000"),
  S3_UPLOAD_ENDPOINT: z.url().optional(),
  S3_REGION: z.string().default("us-east-1"),
  S3_BUCKET: z.string().min(1).default("namarca-private"),
  S3_ACCESS_KEY_ID: z.string().min(1),
  S3_SECRET_ACCESS_KEY: z.string().min(1),
  PIXGO_MODE: z.enum(["mock", "live"]).default("mock"),
  PIXGO_LIVE_AUTHORIZED: z.enum(["true", "false"]).default("false"),
  PIXGO_BASE_URL: z.url().default("http://pixgo-mock:4010/api/v1"),
  PIXGO_API_KEY: z.string().min(1),
  PIXGO_WEBHOOK_SECRET: z.string().min(16),
  PIXGO_WEBHOOK_URL: z.url().default("http://app:3000/api/webhooks/pixgo"),
});
export type ServerEnv = z.infer<typeof schema>;
export function getEnv(): ServerEnv {
  const env = schema.parse(process.env);
  if (env.PIXGO_MODE === "live") {
    if (env.PIXGO_LIVE_AUTHORIZED !== "true") throw new Error("Live PixGo requires explicit authorization");
    if (!env.PIXGO_BASE_URL.startsWith("https://")) throw new Error("Live PixGo requires HTTPS");
  }
  return env;
}
