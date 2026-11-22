'use client';

import { Check, CircleAlert, LoaderCircle } from 'lucide-react';

export type UploadItem = { id: string; name: string; status: 'waiting' | 'uploading' | 'done' | 'failed' };
export type SaveProgress = { phase: 'preparing' | 'uploading' | 'saving' | 'failed'; completed: number; total: number; files?: UploadItem[]; sectionLabel?: string; failureStage?: 'uploading' | 'saving' };

export function StudioSaveProgress({ progress }: { progress: SaveProgress }) {
  const { phase, completed, total, files = [], sectionLabel = 'materiais', failureStage } = progress;
  const failed = phase === 'failed';
  const failedCount = files.filter(file => file.status === 'failed').length;
  const title = failed
    ? failureStage === 'saving' ? total > 0 ? 'Os arquivos foram enviados, mas as alterações não foram salvas.' : 'Não foi possível salvar as alterações.' : failedCount ? `Não foi possível enviar ${failedCount} ${failedCount === 1 ? 'arquivo' : 'arquivos'}.` : 'Não foi possível preparar o salvamento.'
    : phase === 'preparing' ? `Preparando ${sectionLabel}…` : phase === 'uploading' ? `Enviando ${sectionLabel}…` : `Salvando ${sectionLabel}…`;
  const statusLabel = { waiting: 'Na fila', uploading: 'Enviando…', done: 'Enviado', failed: 'Não enviado' };
  // Keep the current upload and any failures visible; no collapsed queue.
  const visibleFiles = files.filter(file => file.status === 'uploading' || file.status === 'failed');
  return <div className="ws-save-progress" data-phase={phase}>
    <div className="ws-save-progress-heading" role="status" aria-live="polite" aria-atomic="true">
      <strong>{title}</strong>
      {phase === 'uploading' && <span className="ws-save-progress-count">{completed} de {total}<span className="sr-only"> arquivos processados, não bytes enviados</span></span>}
    </div>
    {phase === 'uploading' && <div className="ws-save-progress-track" role="progressbar" aria-label="Arquivos processados" aria-valuemin={0} aria-valuemax={total || 1} aria-valuenow={completed}><span style={{ width: `${total ? completed / total * 100 : 0}%` }} /></div>}
    {failed && files.some(file => file.status === 'done') && <p className="ws-save-progress-hint">Os envios concluídos foram preservados. Tente novamente para continuar.</p>}
    {visibleFiles.length > 0 && <ul className="ws-save-progress-files" aria-label="Arquivo em envio e falhas" tabIndex={0}>{visibleFiles.map(file => <li key={file.id} data-state={file.status}>
        <span className="ws-save-file-icon" aria-hidden="true">{file.status === 'failed' ? <CircleAlert /> : file.status === 'done' ? <Check /> : file.status === 'uploading' ? <LoaderCircle className="ws-save-file-spinner" /> : null}</span>
        <span className="ws-save-file-name" title={file.name}>{file.name}</span><span className="ws-save-file-status">{statusLabel[file.status]}</span>
      </li>)}</ul>}
  </div>;
}
