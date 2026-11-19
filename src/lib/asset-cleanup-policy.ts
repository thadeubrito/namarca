import { UUID } from "./campaign-editor";

export const CLEANUP_MIN_AGE_MS = 24 * 60 * 60 * 1000;
export const CLEANUP_BATCH_LIMIT = 100;
export function campaignAssetPrefix(campaignId: string) {
  if (!UUID.test(campaignId)) throw new Error("Invalid campaign ID");
  return `private/campaigns/${campaignId.toLowerCase()}/assets/`;
}
export function campaignAssetKey(campaignId: string, id: string) {
  if (!UUID.test(id)) throw new Error("Invalid asset ID");
  return `${campaignAssetPrefix(campaignId)}${id.toLowerCase()}.png`;
}
export function assetIdFromKey(campaignId: string, key: string): string | undefined {
  const prefix = campaignAssetPrefix(campaignId);
  if (!key.startsWith(prefix)) return;
  const filename = key.slice(prefix.length);
  if (!filename.endsWith(".png") || !UUID.test(filename.slice(0, -4))) return;
  return filename.slice(0, -4).toLowerCase();
}
// Read IDs AND filenames: old snapshots can outlive metadata and may have noncanonical IDs.
// Unexpected config shapes fail closed rather than risk deleting retained data.
export function referencedAssetIds(config: unknown): Set<string> {
  if (!config || typeof config !== "object") throw new Error("Invalid retained configuration");
  const ids = new Set<string>();
  for (const field of ["artworks", "stickers"] as const) {
    const items = (config as Record<string, unknown>)[field];
    if (!Array.isArray(items)) throw new Error("Invalid retained gallery");
    for (const item of items) {
      if (!item || typeof item !== "object") throw new Error("Invalid retained material");
      const { id, file } = item as Record<string, unknown>;
      if (typeof id === "string" && UUID.test(id)) ids.add(id.toLowerCase());
      if (typeof file === "string" && file.endsWith(".png") && UUID.test(file.slice(0, -4))) ids.add(file.slice(0, -4).toLowerCase());
    }
  }
  return ids;
}
export function removedAssetIds(previous: unknown, next: unknown): string[] {
  const current = referencedAssetIds(next);
  return [...referencedAssetIds(previous)].filter((id) => !current.has(id));
}
export function oldEnough(date: Date | undefined, now: Date) {
  return !!date && Number.isFinite(date.getTime()) && date.getTime() <= now.getTime() - CLEANUP_MIN_AGE_MS;
}
