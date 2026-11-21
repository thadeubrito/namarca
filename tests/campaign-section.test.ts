import assert from 'node:assert/strict';
import test from 'node:test';
import { campaignSection, campaignSectionUrl } from '../src/lib/campaign-section';

test('campaign sections restore available tabs from the URL', () => {
  for (const section of ['dados', 'artes', 'stickers', 'cores', 'cobranca', 'publicacao']) {
    assert.equal(campaignSection(section, true, true), section);
  }
  for (const section of [null, '', 'inexistente', 'PUBLICACAO']) {
    assert.equal(campaignSection(section, true, true), 'dados');
  }
  for (const section of ['artes', 'stickers', 'cores']) {
    assert.equal(campaignSection(section, false, true), 'dados');
  }
  assert.equal(campaignSection('publicacao', true, false), 'dados');
  assert.equal(campaignSection('cobranca', false, false), 'cobranca');
});

test('tab navigation replaces only its query parameter and preserves the campaign and fragment', () => {
  assert.equal(campaignSectionUrl('https://app.test/campanhas/123?filtro=ativo#contexto', 'publicacao'), '/campanhas/123?filtro=ativo&aba=publicacao#contexto');
  assert.equal(campaignSectionUrl('https://app.test/campanhas/123?aba=artes&aba=cores', 'dados'), '/campanhas/123?aba=dados');
});
