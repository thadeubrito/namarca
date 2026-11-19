import { expect, type Locator } from '@playwright/test';

export const studioTabName = (label: string) => new RegExp(`^${label}$`);

/** Explicitly save one section; never hide an unrelated pending section behind a global save. */
export async function saveStudioSection(studio: Locator, label: 'artes' | 'figurinhas' | 'cores') {
  const tab = label === 'artes' ? 'Artes' : label === 'figurinhas' ? 'Figurinhas' : 'Cores';
  await studio.getByRole('tab', { name: studioTabName(tab) }).click();
  await studio.getByRole('button', { name: `Salvar ${label}`, exact: true }).click();
  await expect(studio.locator('[role="status"].sr-only').filter({ hasText: new RegExp(`^${tab} salvas\\.`) })).toHaveText(`${tab} salvas. A campanha não foi publicada.`);
  await expect(studio.getByRole('button', { name: `Salvar ${label}`, exact: true })).toBeDisabled();
}
