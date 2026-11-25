import { bootstrapAdmin } from "@/lib/admin-bootstrap";

export const runtime = "nodejs";
const headers = {
  "Cache-Control": "no-store",
  "Referrer-Policy": "no-referrer",
  "X-Robots-Tag": "noindex, nofollow",
};
function response(ok: boolean) {
  return Response.json(ok ? { ok: true } : { error: "Não foi possível concluir o primeiro acesso." }, { status: ok ? 200 : 400, headers });
}

// Enforce actual bytes, even with chunked bodies or a forged Content-Length.
export async function POST(request: Request) {
  try {
    const configured = new URL(process.env.BETTER_AUTH_URL ?? "");
    if (request.url.includes("?") || request.headers.get("origin") !== configured.origin ||
      !/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(request.headers.get("content-type") ?? "")) return response(false);
    const reader = request.body?.getReader();
    if (!reader) return response(false);
    const chunks: Uint8Array[] = [];
    let size = 0;
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > 4096) { await reader.cancel(); return response(false); }
        chunks.push(value);
      }
    } finally { reader.releaseLock(); }
    const body = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(chunks)));
    return response(await bootstrapAdmin(body));
  } catch { return response(false); }
}
