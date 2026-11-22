import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

test('directory uses real public differences, not legacy preparation status', async () => {
  const page = await readFile('apps/admin/src/app/(workspace)/page.tsx', 'utf8');
  const directory = await readFile('apps/admin/src/components/admin-workspace/campaign-directory.tsx', 'utf8');
  assert.doesNotMatch(directory, /preparationStatus|Preparação|Aprovadas|Validada/);
  assert.match(page, /hasUnpublishedChanges\(editorConfig \? deriveCampaignEvent\(editorConfig, campaign\) : defaultCampaignEvent\(campaign\), publicConfig\)/);
  assert.match(page, /case when \$\{campaignPublications.deliveredAt\} is not null then \$\{campaignPublications.config\}/);
  assert.match(page, /order by h.delivered_at desc, h.version desc/);
  assert.match(directory, /c.deliveryPending \? 'Envio pendente' : 'Alterações não publicadas'/);
  assert.match(directory, /\(c.deliveryPending \|\| c.unpublishedChanges\) &&/);
  assert.match(directory, /\['draft', 'Rascunhos'\], \['published', 'Publicadas'\]/);
});
