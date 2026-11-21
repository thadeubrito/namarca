'use client';

import { useId, useState, type ReactNode } from 'react';
import { ArrowRight, Check, ChevronDown, GitCompareArrows } from 'lucide-react';
import type { Artwork, EventConfig, Material } from '@namarca/editor/events';
import { comparePublicationEvents, type MaterialChanges, type MaterialFieldChange, type PublicationField } from '@/lib/publication-diff';
import { Field } from './primitives';
import { SelectField } from './form-controls';

export type PublicationDiffVersion = { version: number; config: EventConfig; publishedBy: string; deliveredAt: string };
export type PublicationDiffProps = { campaignId: string; versions: PublicationDiffVersion[]; draft: EventConfig };
const labels: Record<PublicationField, string> = { slug: 'Endereço', name: 'Nome', endsAt: 'Encerramento', demo: 'Demonstração', color: 'Cor do manifesto', 'theme.background': 'Fundo', 'theme.surface': 'Painéis', 'theme.accent': 'Destaque', 'theme.text': 'Texto' };
function date(value: string) {
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo' }).format(parsed) : 'Data indisponível';
}
function Value({ field, value }: { field: PublicationField; value: string | boolean }) {
  if (typeof value === 'boolean') return <>{value ? 'Sim' : 'Não'}</>;
  if (field === 'endsAt') return <time dateTime={value}>{date(value)} <small>São Paulo</small></time>;
  if (field === 'color' || field.startsWith('theme.')) return <span className="ws-diff-color"><span aria-hidden className="ws-diff-swatch" style={{ backgroundColor: value }} />{value.toUpperCase()}</span>;
  return <>{value}</>;
}
function Pair({ before, after }: { before: ReactNode; after: ReactNode }) {
  return <div className="ws-diff-pair"><span className="ws-diff-before"><span className="sr-only">Antes: </span>{before}</span><ArrowRight className="ws-diff-arrow" aria-hidden /><span className="ws-diff-after"><span className="sr-only">Depois: </span>{after}</span></div>;
}
function reference(value: Artwork['reference']) { return `x ${value.x}, y ${value.y} · ${value.width} × ${value.height} px`; }
function materialValue(change: MaterialFieldChange, side: 'before' | 'after') {
  return change.field === 'reference' ? reference(change[side]) : change.field === 'name' ? change[side] : `${change[side]} px`;
}
const materialLabels = { name: 'Nome', width: 'Largura', height: 'Altura', reference: 'Área da foto' };
function Thumbnail({ campaignId, material }: { campaignId: string; material: Material }) {
  return <img className="ws-diff-thumbnail" src={`/api/campaigns/${encodeURIComponent(campaignId)}/assets/${encodeURIComponent(material.id)}`} alt={`Material: ${material.name}`} width={32} height={32} loading="lazy" />;
}
function Materials({ title, changes, campaignId, id }: { title: string; changes: MaterialChanges<Material>; campaignId: string; id: string }) {
  const count = new Set([...changes.added.map(item => item.id), ...changes.removed.map(item => item.id), ...changes.modified.map(item => item.id), ...changes.reordered.map(item => item.id)]).size;
  if (!count) return null;
  const ids = [...new Set([...changes.added, ...changes.removed, ...changes.modified, ...changes.reordered].map(item => item.id))];
  return <section aria-labelledby={id} className="ws-diff-section"><header><h3 id={id}>{title}</h3><span>{count}</span></header><ul className="ws-diff-material-list">
    {ids.map(materialId => {
      const added = changes.added.find(item => item.id === materialId);
      const removed = changes.removed.find(item => item.id === materialId);
      const modified = changes.modified.find(item => item.id === materialId);
      const reordered = changes.reordered.find(item => item.id === materialId);
      const item = added ?? removed ?? modified?.after ?? (reordered ? { id: reordered.id, name: reordered.name, file: `${reordered.id}.png` } : undefined);
      const name = item?.name ?? reordered!.name;
      return <li key={materialId} className="ws-diff-row ws-diff-material">
        <div className="ws-diff-row-title">{item && <Thumbnail campaignId={campaignId} material={item} />}<span>{name}</span></div>
        <div className="ws-diff-row-value">
          {(added || removed) && <span className="ws-diff-tag">{added ? 'Adicionado' : 'Removido'}</span>}
          {modified?.changes.map(change => <div className="ws-diff-change" key={change.field}><span className="ws-diff-change-label">{materialLabels[change.field]}</span><Pair before={materialValue(change, 'before')} after={materialValue(change, 'after')} /></div>)}
          {reordered && <div className="ws-diff-change"><span className="ws-diff-change-label">Posição</span><Pair before={reordered.before} after={reordered.after} /></div>}
        </div>
      </li>;
    })}
  </ul></section>;
}

export function PublicationDiff({ campaignId, versions, draft }: PublicationDiffProps) {
  const id = useId();
  const ordered = [...versions].sort((a, b) => b.version - a.version);
  const [origin, setOrigin] = useState(String(ordered[0]?.version ?? ''));
  const [destination, setDestination] = useState('draft');
  const before = ordered.find(item => String(item.version) === origin) ?? ordered[0];
  const after = destination === 'draft' ? undefined : ordered.find(item => String(item.version) === destination);
  const diff = before ? comparePublicationEvents(before.config, after?.config ?? draft) : null;
  const fields = diff?.fields ?? [];
  const materialCount = (changes: MaterialChanges<Material>) => new Set([...changes.added, ...changes.removed, ...changes.modified, ...changes.reordered].map(item => item.id)).size;
  const count = diff ? fields.length + materialCount(diff.artworks) + materialCount(diff.stickers) : 0;
  const audit = (version: PublicationDiffVersion) => <><time dateTime={version.deliveredAt}>{date(version.deliveredAt)} · São Paulo</time><span title={version.publishedBy}>Por {version.publishedBy}</span></>;
  return <details className="ws-publication-diff" aria-labelledby={`${id}-summary`}><summary id={`${id}-summary`}><span className="ws-diff-summary-icon"><GitCompareArrows aria-hidden /></span><span><strong>Comparar alterações</strong><small>Revise o que muda entre as versões</small></span><ChevronDown className="ws-diff-chevron" aria-hidden /></summary>
    {!before ? <p className="ws-diff-empty">Nenhuma versão entregue para comparar.</p> : <div className="ws-diff-body">
      <div className="ws-diff-versions"><div className="ws-diff-version"><Field label="Comparar de"><SelectField name={`${id}-origin`} label="Origem" value={String(before.version)} onValueChange={setOrigin} options={ordered.map(item => ({ value: String(item.version), label: `Versão ${item.version}` }))} /></Field><div className="ws-diff-audit">{audit(before)}</div></div><ArrowRight className="ws-diff-version-arrow" aria-hidden /><div className="ws-diff-version"><Field label="Para"><SelectField name={`${id}-destination`} label="Destino" value={after ? String(after.version) : 'draft'} onValueChange={setDestination} options={[{ value: 'draft', label: 'Rascunho salvo' }, ...ordered.map(item => ({ value: String(item.version), label: `Versão ${item.version}` }))]} /></Field><div className="ws-diff-audit">{after ? audit(after) : <><span>Versão em preparação</span><span>Somente alterações salvas</span></>}</div></div></div>
      <div className="ws-diff-result" role="status" aria-live="polite" aria-atomic="true">{diff?.hasChanges ? <><strong>{count} {count === 1 ? 'alteração' : 'alterações'}</strong><span>entre {`a versão ${before.version}`} e {after ? `a versão ${after.version}` : 'o rascunho salvo'}</span></> : <><span className="ws-diff-check"><Check aria-hidden /></span><div><strong>Nenhuma alteração</strong><p>O conteúdo público é o mesmo nas duas versões.</p></div></>}</div>
      {(['Detalhes', 'Cores'] as const).map(title => {
        const group = fields.filter(change => (change.field === 'color' || change.field.startsWith('theme.')) === (title === 'Cores'));
        return group.length > 0 && <section key={title} className="ws-diff-section" aria-labelledby={`${id}-${title}`}><header><h3 id={`${id}-${title}`}>{title}</h3><span>{group.length}</span></header><dl className="ws-diff-fields">{group.map(change => <div className="ws-diff-row ws-diff-field" key={change.field}><dt className="ws-diff-row-title">{labels[change.field]}</dt><dd className="ws-diff-row-value"><Pair before={<Value field={change.field} value={change.before} />} after={<Value field={change.field} value={change.after} />} /></dd></div>)}</dl></section>;
      })}
      {diff && <><Materials title="Artes" changes={diff.artworks} campaignId={campaignId} id={`${id}-artworks`} /><Materials title="Figurinhas" changes={diff.stickers} campaignId={campaignId} id={`${id}-stickers`} /></>}
    </div>}
  </details>;
}
