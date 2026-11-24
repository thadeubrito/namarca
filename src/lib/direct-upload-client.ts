import { uploadFailureMessage } from './upload-feedback';

/** Only campaign materials use this transport; participant photos never enter it. */
export async function uploadCampaignMaterial(campaignId: string, input: { id: string; name: string; kind: 'artwork' | 'sticker'; file: Blob }) {
  const digest = await crypto.subtle.digest('SHA-256', await input.file.arrayBuffer());
  const sha256 = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
  const base = `/api/campaigns/${campaignId}/assets/uploads`;
  const authorization = await fetch(base, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: input.id, name: input.name, kind: input.kind, byteLength: input.file.size, sha256 }),
  });
  if (!authorization.ok) throw new Error(await uploadFailureMessage(authorization));
  const ticket = await authorization.json() as { id: string; completed: boolean; url?: string };
  if (ticket.id !== input.id) throw new Error('Não foi possível autorizar o arquivo.');
  if (!ticket.completed) {
    if (!ticket.url || !['http:', 'https:'].includes(new URL(ticket.url).protocol)) throw new Error('Não foi possível autorizar o arquivo.');
    let response: Response;
    try {
      response = await fetch(ticket.url, { method: 'PUT', headers: { 'Content-Type': 'image/png' }, body: input.file, credentials: 'omit', referrerPolicy: 'no-referrer', redirect: 'error' });
    } catch { throw new Error('Não foi possível enviar o PNG ao armazenamento. Confira sua conexão e tente novamente.'); }
    // Never display storage XML/errors or the signed URL (a temporary credential).
    if (!response.ok) throw new Error('Não foi possível enviar o PNG ao armazenamento. Tente novamente.');
  }
  const complete = await fetch(`${base}/${input.id}/complete`, { method: 'POST' });
  if (!complete.ok) throw new Error(await uploadFailureMessage(complete));
  const result = await complete.json() as { material: { id: string } };
  if (result.material.id !== input.id) throw new Error('Não foi possível confirmar o arquivo.');
  return result;
}
