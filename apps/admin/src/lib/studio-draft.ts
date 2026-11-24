import type { CampaignConfig } from '@namarca/editor/campaigns';

export type LocalMaterial = { id: string; file: Blob; kind: 'artwork' | 'sticker'; uploaded: boolean };
export type StudioDraft = { event: CampaignConfig; revision: number; materials: LocalMaterial[]; updatedAt: number };
const database = 'namarca-studio-drafts';

/** JSONB can reorder object keys; gallery array order remains significant. */
export function sameDraftValue(left: unknown, right: unknown): boolean {
  const canonical = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(canonical);
    if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, entry]) => [key, canonical(entry)]));
    return value;
  };
  return JSON.stringify(canonical(left)) === JSON.stringify(canonical(right));
}

/** getRandomValues also works on the isolated HTTP development origin. */
export function localMaterialId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** A duplicated tab inherits sessionStorage; a live owner forces a fresh token. */
export async function claimDraftTab(): Promise<{ token: string; release: () => void }> {
  let token = sessionStorage.getItem('namarca-studio-tab') || localMaterialId();
  if (typeof BroadcastChannel === 'undefined') {
    sessionStorage.setItem('namarca-studio-tab', token);
    return { token, release: () => {} };
  }
  const channel = new BroadcastChannel('namarca-studio-tabs');
  const instance = localMaterialId();
  let collision = false;
  const receive = (message: MessageEvent) => {
    const data = message.data;
    if (data?.token !== token || data.instance === instance) return;
    if (data.type === 'claim') channel.postMessage({ type: 'owned', token, instance, target: data.instance });
    if (data.type === 'owned' && data.target === instance) collision = true;
  };
  channel.addEventListener('message', receive);
  channel.postMessage({ type: 'claim', token, instance });
  await new Promise(resolve => setTimeout(resolve, 100));
  if (collision) token = localMaterialId();
  sessionStorage.setItem('namarca-studio-tab', token);
  return { token, release: () => channel.close() };
}

async function access<T>(key: string, mode: IDBTransactionMode, operation: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(database, 1);
    request.onupgradeneeded = () => request.result.createObjectStore('drafts');
    request.onsuccess = () => resolve(request.result);
    request.onblocked = () => reject(new Error('Armazenamento local bloqueado por outra aba.'));
    request.onerror = () => reject(new Error('Armazenamento local indisponível.'));
  });
  return new Promise<T>((resolve, reject) => {
    let transaction: IDBTransaction;
    let request: IDBRequest<T>;
    try {
      transaction = db.transaction('drafts', mode);
      request = operation(transaction.objectStore('drafts'));
    } catch {
      db.close(); reject(new Error('Não foi possível acessar o rascunho local.')); return;
    }
    transaction.oncomplete = () => { db.close(); resolve(request.result); };
    transaction.onerror = transaction.onabort = () => { db.close(); reject(new Error('Não foi possível guardar o rascunho neste navegador.')); };
  });
}
export const draftKey = (owner: string, campaign: string) => `${owner}:${campaign}`;
export const readStudioDraft = (key: string) => access<StudioDraft | undefined>(key, 'readonly', store => store.get(key));
export const writeStudioDraft = (key: string, draft: StudioDraft) => access(key, 'readwrite', store => store.put(draft, key));
export const deleteStudioDraft = (key: string) => access(key, 'readwrite', store => store.delete(key));

/** Finish every in-flight upload before reporting failure, so retries know what succeeded. */
export async function uploadPool<T>(items: T[], upload: (item: T) => Promise<void>, concurrency = 3) {
  let index = 0;
  let failed = false;
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (index < items.length) {
      const item = items[index++];
      try { await upload(item); } catch { failed = true; }
    }
  }));
  if (failed) throw new Error('Alguns arquivos não foram enviados. Tente salvar novamente; os envios concluídos serão reutilizados.');
}
