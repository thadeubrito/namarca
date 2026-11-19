'use client';

import { useRef, useState } from 'react';
import { Action, Notice } from './primitives';

type Candidate = { id: string; bytes?: number };
type Analysis = { candidates: Candidate[]; totalBytes?: number };
type Feedback = { tone: 'error' | 'success'; text: string };
const MAX_BATCH = 100;

function validBytes(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

function parseAnalysis(value: unknown): Analysis {
  if (!value || typeof value !== 'object' || !('candidates' in value) || !Array.isArray(value.candidates)) throw new Error('Invalid analysis');
  const ids = new Set<string>();
  const candidates = value.candidates.map((item: unknown): Candidate => {
    if (!item || typeof item !== 'object' || !('id' in item) || typeof item.id !== 'string' || !item.id.trim() || ids.has(item.id)) throw new Error('Invalid candidate');
    ids.add(item.id);
    const bytes = 'bytes' in item ? item.bytes : undefined;
    if (bytes !== undefined && !validBytes(bytes)) throw new Error('Invalid size');
    return { id: item.id, bytes };
  });
  const totalBytes = 'totalBytes' in value ? value.totalBytes : undefined;
  if (totalBytes !== undefined && !validBytes(totalBytes)) throw new Error('Invalid size');
  return { candidates, totalBytes };
}

function formatSpace(bytes: number | undefined) {
  if (bytes === undefined) return 'espaço não informado';
  const units = ['B', 'KiB', 'MiB', 'GiB', 'TiB'];
  const unit = bytes === 0 ? 0 : Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: unit ? 1 : 0 }).format(bytes / 1024 ** unit)} ${units[unit]}`;
}

function candidateBytes(candidates: Candidate[]) {
  if (!candidates.every(candidate => candidate.bytes !== undefined)) return undefined;
  const total = candidates.reduce((sum, candidate) => sum + candidate.bytes!, 0);
  return validBytes(total) ? total : undefined;
}

/** Isolated maintenance control. Analysis never deletes; each confirmed POST is at most 100 IDs. */
export function StudioCleanup({ campaignId, disabled = false }: { campaignId: string; disabled?: boolean }) {
  return <CleanupControl key={campaignId} campaignId={campaignId} disabled={disabled} />;
}

function CleanupControl({ campaignId, disabled }: { campaignId: string; disabled: boolean }) {
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [busy, setBusy] = useState<'analysis' | 'delete' | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const locked = useRef(false);
  const endpoint = `/api/campaigns/${encodeURIComponent(campaignId)}/assets/cleanup`;
  const batch = analysis?.candidates.slice(0, MAX_BATCH) ?? [];

  async function analyze() {
    if (locked.current || disabled) return;
    locked.current = true;
    setBusy('analysis');
    setFeedback(null);
    setAnalysis(null);
    try {
      const response = await fetch(endpoint, { method: 'GET', cache: 'no-store', credentials: 'same-origin' });
      if (!response.ok) throw new Error('Analysis failed');
      setAnalysis(parseAnalysis(await response.json()));
    } catch {
      setFeedback({ tone: 'error', text: 'Não foi possível analisar os arquivos. Tente novamente.' });
    } finally {
      locked.current = false;
      setBusy(null);
    }
  }

  async function remove() {
    if (locked.current || disabled || !batch.length) return;
    locked.current = true;
    try {
      if (!window.confirm(`Excluir permanentemente ${batch.length} arquivo(s) não utilizado(s) (${formatSpace(candidateBytes(batch))})? Esta ação não pode ser desfeita.`)) return;
      setBusy('delete');
      setFeedback(null);
      // Invalidate even on network failure: a POST may have completed on the server.
      setAnalysis(null);
      const ids = batch.map(candidate => candidate.id);
      const response = await fetch(endpoint, {
        method: 'POST', credentials: 'same-origin', cache: 'no-store',
        headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids }),
      });
      if (!response.ok) throw new Error('Cleanup failed');
      const result: unknown = await response.json();
      if (!result || typeof result !== 'object' || !('deleted' in result) || !('failed' in result)
        || !Array.isArray(result.deleted) || !Array.isArray(result.failed)) throw new Error('Invalid result');
      const skipped = 'skipped' in result && Array.isArray(result.skipped) ? result.skipped : [];
      const outcomes: unknown[] = [...result.deleted, ...result.failed, ...skipped];
      if (outcomes.length !== ids.length || new Set(outcomes).size !== ids.length
        || !outcomes.every(id => typeof id === 'string' && ids.includes(id))) throw new Error('Invalid result');
      setFeedback({
        tone: result.failed.length ? 'error' : 'success',
        text: `${result.deleted.length} arquivo(s) excluído(s). ${skipped.length ? `${skipped.length} arquivo(s) preservado(s) após nova verificação. ` : ''}${result.failed.length ? `${result.failed.length} arquivo(s) não foram excluídos. ` : ''}Analise novamente para conferir os arquivos restantes.`,
      });
    } catch {
      setFeedback({ tone: 'error', text: 'Não foi possível confirmar a limpeza. Analise novamente antes de tentar excluir outros arquivos.' });
    } finally {
      locked.current = false;
      setBusy(null);
    }
  }

  return <details className="ws-studio-cleanup">
    <summary>Limpar arquivos não utilizados</summary>
    <div className="flex flex-col gap-3 py-3" aria-busy={busy !== null}>
      <p className="ws-description">Preserva arquivos usados na configuração salva e nos históricos. Ignora arquivos enviados há menos de 24 horas. Salve suas alterações no estúdio antes de analisar.</p>
      <div className="flex flex-wrap gap-2">
        <Action variant="secondary" disabled={busy !== null || disabled} onClick={analyze}>{busy === 'analysis' ? 'Analisando…' : 'Analisar'}</Action>
        {batch.length > 0 && <Action variant="danger" disabled={busy !== null || disabled} onClick={remove}>{busy === 'delete' ? 'Excluindo…' : `Excluir ${batch.length} arquivo(s)`}</Action>}
      </div>
      <div aria-live="polite" aria-atomic="true">
        {analysis && <Notice>{analysis.candidates.length === 0
          ? 'Nenhum arquivo não utilizado disponível para limpeza. Espaço recuperável: 0 B.'
          : <>{analysis.candidates.length} arquivo(s) não utilizado(s) · {formatSpace(analysis.totalBytes ?? candidateBytes(analysis.candidates))} recuperáveis. A análise não exclui arquivos.{analysis.candidates.length > MAX_BATCH && <> A próxima exclusão inclui somente {MAX_BATCH} arquivos ({formatSpace(candidateBytes(batch))}). Analise novamente após cada lote.</>}</>}
        </Notice>}
        {busy === 'delete' && <p role="status">Excluindo o lote confirmado…</p>}
      </div>
      {feedback && <Notice tone={feedback.tone}>{feedback.text}</Notice>}
    </div>
  </details>;
}
