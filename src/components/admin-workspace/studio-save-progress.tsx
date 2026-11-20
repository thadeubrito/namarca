'use client';

import { Check, LoaderCircle, Upload, Save, Files, FileImage, CircleAlert, X } from 'lucide-react';
import { useSyncExternalStore } from 'react';

const motionQuery = '(prefers-reduced-motion: reduce)';
const subscribeMotion = (notify: () => void) => {
  const media = window.matchMedia(motionQuery);
  media.addEventListener('change', notify);
  return () => media.removeEventListener('change', notify);
};
const motionSnapshot = () => window.matchMedia(motionQuery).matches;
const serverMotionSnapshot = () => true;
import ShinyText from '@/components/ShinyText';
import { useDarkTheme } from '@/components/theme-scope';

export type UploadItem = { id: string; name: string; status: 'waiting' | 'uploading' | 'done' | 'failed' };
export type SaveProgress = { phase: 'preparing' | 'uploading' | 'saving' | 'success' | 'ready'; completed: number; total: number; files?: UploadItem[]; sectionLabel?: string };

export function StudioSaveProgress({ progress, onClose }: { progress: SaveProgress; onClose: () => void }) {
  const reduced = useSyncExternalStore(subscribeMotion, motionSnapshot, serverMotionSnapshot);
  const dark = useDarkTheme();
  const { phase, completed, total, files = [] } = progress;
  const finished = phase === 'success' || phase === 'ready';
  const step = phase === 'success' ? 3 : phase === 'preparing' || phase === 'ready' ? 0 : phase === 'uploading' ? 1 : 2;
  const title = phase === 'success' ? (progress.sectionLabel ? `${progress.sectionLabel} salvas` : 'Configuração salva') : phase === 'ready' ? 'Materiais prontos para editar' : phase === 'preparing' ? 'Preparando arquivos' : phase === 'uploading' ? 'Enviando materiais' : 'Salvando configuração';
  const detail = phase === 'success' ? 'Suas alterações foram confirmadas no servidor.' : phase === 'ready' ? `${completed} arquivo(s) adicionado(s) neste navegador. Salve para enviar.` : phase === 'preparing' ? 'Verificando os materiais antes de enviar.' : phase === 'uploading' ? `${completed} de ${total} arquivos processados` : 'Confirmando suas alterações no servidor.';
  const percent = total ? Math.round(completed / total * 100) : 0;
  const stageLabel = phase === 'success' ? 'Todas as etapas concluídas' : phase === 'ready' ? 'Preparação local concluída' : `Etapa ${step + 1} de 3 — ${['Preparar', 'Enviar', 'Salvar'][step]}`;
  const statusLabel = { waiting: 'Aguardando', uploading: 'Enviando…', done: 'Enviado', failed: 'Falhou' };
  const shown = files;
  const Icon = finished ? Check : phase === 'preparing' ? Files : phase === 'uploading' ? Upload : Save;
  return <div className="ws-save-progress" aria-busy={!finished} data-phase={phase}>
    {finished && <button type="button" className="ws-save-progress-close" aria-label="Fechar resumo da operação" onClick={onClose}><X aria-hidden="true" /></button>}
    <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">{stageLabel}. {title}. {detail}</div>
    <p className="ws-save-progress-stage">{stageLabel}</p>
    <div className="ws-save-progress-heading"><span className="ws-save-progress-icon" aria-hidden="true"><Icon /></span><div><strong>{reduced || finished ? title : <ShinyText text={title} color={dark ? '#ffffff' : '#191c1f'} shineColor={dark ? '#a4a8ff' : '#494fdf'} speed={2.4} delay={.4} />}</strong><p>{detail}</p></div>{phase === 'uploading' && <span className="ws-save-progress-count" aria-hidden="true">{percent}% </span>}</div>
    {phase !== 'ready' && <div className="ws-save-progress-track" role="progressbar" aria-label={title} aria-valuemin={0} aria-valuemax={total || 1} aria-valuenow={phase === 'success' ? (total || 1) : phase === 'uploading' ? completed : undefined} aria-valuetext={detail} data-indeterminate={!finished && phase !== 'uploading'}><span style={phase === 'success' ? { width: '100%' } : phase === 'uploading' ? { width: `${total ? completed / total * 100 : 0}%` } : undefined} /></div>}
    {shown.length > 0 && <ul className="ws-save-progress-files" aria-label="Arquivos em processamento">{shown.map((file, index) => <li key={file.id} data-state={file.status}><span className="ws-save-file-number">{index + 1}</span><FileImage aria-hidden="true" /><span className="ws-save-file-name" title={file.name}>{file.name}</span><span className="ws-save-file-status">{statusLabel[file.status]}</span>{file.status === 'failed' ? <CircleAlert aria-hidden="true" /> : file.status === 'done' ? <Check aria-hidden="true" /> : file.status === 'uploading' ? <LoaderCircle className="ws-save-file-spinner" aria-hidden="true" /> : null}</li>)}</ul>}
    {phase === 'uploading' && <p className="ws-save-progress-hint">Percentual por arquivos processados, não por tamanho. {files.filter(file => file.status === 'waiting').length} na fila.</p>}
    {phase !== 'ready' && <ol className="ws-save-progress-steps" aria-label="Etapas do salvamento">{[{ label: 'Preparar', icon: Files }, { label: 'Enviar', icon: Upload }, { label: 'Salvar', icon: Save }].map(({ label, icon: StepIcon }, index) => <li key={label} aria-current={index === step ? 'step' : undefined} data-state={index < step ? 'done' : index === step ? 'active' : 'waiting'}><span>{index < step ? <Check /> : <StepIcon />}</span><span>{label}<small>{index < step ? 'Concluído' : index === step ? 'Em andamento' : 'A seguir'}</small></span></li>)}</ol>}
  </div>;
}
