'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { AlertDialog } from 'radix-ui';
import { useDarkTheme } from '@/components/theme-scope';
import { useCampaignSectionStatus } from './campaign-sections';
import { useCampaignRecovery } from './campaign-recovery';
import { Action, Notice } from './primitives';

// Explicit allow-list: never serialize the form, hidden action metadata or files.
const allowed = ['name', 'slug', 'endsAt', 'clientId', 'clientName', 'clientContact', 'notes', 'amount'] as const;
type DraftField = typeof allowed[number];
export type FormDraftValues = Partial<Record<DraftField, string>>;
type LocalDraft = { version: 1; values: FormDraftValues };
const equal = (a: FormDraftValues, b: FormDraftValues, fields: readonly DraftField[]) => fields.every(field => {
  if ((field === 'clientName' || field === 'clientContact') && a.clientId !== 'new' && b.clientId !== 'new') return true;
  return (a[field] ?? '') === (b[field] ?? '');
});

export function useFormDraft({ draftKey, section, fields, submitting = false, onRecover, resolveStoredValues }: {
  draftKey?: string; section: 'dados' | 'cobranca'; fields: readonly DraftField[];
  submitting?: boolean; onRecover?: (values: FormDraftValues) => void;
  resolveStoredValues?: (values: FormDraftValues) => FormDraftValues;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const baseline = useRef<FormDraftValues>({});
  const dirtyRef = useRef(false);
  const submittingRef = useRef(submitting);
  const recoveringRef = useRef(false);
  const [recovery, setRecovery] = useState<LocalDraft | null>(null);
  const [dirty, setDirty] = useState(false);
  const [warning, setWarning] = useState(false);
  const [savedLocally, setSavedLocally] = useState(false);
  const reportStatus = useCampaignSectionStatus();
  const registerRecovery = useCampaignRecovery();
  const [checked, setChecked] = useState(false);
  const reportRef = useRef(reportStatus);
  const resolveStoredRef = useRef(resolveStoredValues);
  useEffect(() => { reportRef.current = reportStatus; resolveStoredRef.current = resolveStoredValues; }, [reportStatus, resolveStoredValues]);
  const report = useCallback((id: string, pending: boolean) => reportRef.current(id, pending), []);
  const key = draftKey ? `namarca:form-draft:v1:${section}:${draftKey}` : undefined;
  useEffect(() => { submittingRef.current = submitting; }, [submitting]);

  const readValues = useCallback(() => {
    const values: FormDraftValues = {};
    for (const field of fields) {
      if (!allowed.includes(field)) continue;
      const control = formRef.current?.elements.namedItem(field);
      if (control instanceof HTMLInputElement || control instanceof HTMLTextAreaElement || control instanceof HTMLSelectElement) values[field] = control.value;
    }
    return values;
  }, [fields]);

  const remove = useCallback(() => {
    if (!key) return;
    try { sessionStorage.removeItem(key); } catch { setWarning(true); }
  }, [key]);

  const persist = useCallback((explicit = false) => {
    if (recoveringRef.current) return;
    const values = readValues();
    const dirty = !equal(values, baseline.current, fields);
    dirtyRef.current = dirty;
    setDirty(dirty);
    report(section, dirty);
    if (!key) return;
    try {
      if (dirty) sessionStorage.setItem(key, JSON.stringify({ version: 1, values } satisfies LocalDraft));
      else sessionStorage.removeItem(key);
      setSavedLocally(explicit && dirty);
    } catch { setWarning(true); setSavedLocally(false); }
  }, [fields, key, readValues, report, section]);

  useEffect(() => {
    const form = formRef.current;
    if (!form) return;
    baseline.current = readValues();
    dirtyRef.current = false;
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      if (!key) { setChecked(true); return; }
      try {
        const raw = sessionStorage.getItem(key);
        if (raw) {
          const parsed: unknown = JSON.parse(raw);
          if (!parsed || typeof parsed !== 'object' || !('version' in parsed) || parsed.version !== 1 || !('values' in parsed) || !parsed.values || typeof parsed.values !== 'object') throw new Error('Invalid draft');
          const values: FormDraftValues = {};
          for (const field of fields) {
            if (!allowed.includes(field)) continue;
            const value = (parsed.values as Record<string, unknown>)[field];
            if (typeof value === 'string' && value.length <= 10000) values[field] = value;
          }
          const resolved = resolveStoredRef.current?.(values) ?? values;
          if (equal(resolved, baseline.current, fields)) sessionStorage.removeItem(key);
          else { recoveringRef.current = true; setRecovery({ version: 1, values: resolved }); setDirty(true); report(section, true); }
        }
      } catch { setWarning(true); }
      finally { setChecked(true); }
    });
    const changed = () => { queueMicrotask(() => { if (formRef.current === form) persist(); }); };
    const unload = (event: BeforeUnloadEvent) => {
      if ((dirtyRef.current || recoveringRef.current) && !submittingRef.current) { event.preventDefault(); event.returnValue = ''; }
    };
    const navigate = (event: MouseEvent) => {
      if ((!dirtyRef.current && !recoveringRef.current) || event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      const link = event.target instanceof Element ? event.target.closest('a[href]') : null;
      if (!(link instanceof HTMLAnchorElement) || link.target === '_blank' || link.hasAttribute('download')) return;
      const url = new URL(link.href, location.href);
      if (url.origin === location.origin && url.pathname === location.pathname && url.search === location.search) return;
      if (!window.confirm('Há alterações não salvas no servidor. Sair desta campanha? O rascunho local depende do armazenamento deste navegador.')) { event.preventDefault(); event.stopImmediatePropagation(); }
    };
    const submitOther = (event: SubmitEvent) => {
      const target = event.target;
      if (target === form || !(target instanceof HTMLFormElement) || event.defaultPrevented || (!dirtyRef.current && !recoveringRef.current)) return;
      const operation = target.elements.namedItem('operation');
      if (target.matches('[data-campaign-save="details"]')) return;
      if (!target.matches('[data-campaign-navigation]') && !(operation instanceof HTMLInputElement && operation.value === 'issue')) return;
      if (!window.confirm('Há alterações não salvas nesta campanha. Continuar sem salvá-las no servidor? O rascunho local será mantido quando o armazenamento estiver disponível.')) {
        event.preventDefault(); event.stopImmediatePropagation();
      }
    };
    form.addEventListener('input', changed);
    form.addEventListener('change', changed);
    window.addEventListener('beforeunload', unload);
    document.addEventListener('click', navigate, true);
    document.addEventListener('submit', submitOther, true);
    return () => {
      active = false;
      form.removeEventListener('input', changed); form.removeEventListener('change', changed);
      window.removeEventListener('beforeunload', unload); document.removeEventListener('click', navigate, true); document.removeEventListener('submit', submitOther, true);
      report(section, false);
    };
  }, [fields, key, persist, readValues, report, section]);

  const recover = () => {
    if (!recovery) return;
    flushSync(() => { onRecover?.(recovery.values); });
    for (const field of fields) {
      const control = formRef.current?.elements.namedItem(field);
      if (control instanceof HTMLInputElement || control instanceof HTMLTextAreaElement || control instanceof HTMLSelectElement) control.value = recovery.values[field] ?? '';
    }
    recoveringRef.current = false;
    setRecovery(null);
    persist();
  };
  const discard = () => {
    remove(); recoveringRef.current = false; setRecovery(null);
    setDirty(dirtyRef.current);
    report(section, dirtyRef.current);
  };
  const decisions = useRef({ recover, discard });
  useEffect(() => { decisions.current = { recover, discard }; });
  useEffect(() => {
    if (!checked || !registerRecovery) return;
    registerRecovery(section, recovery ? { recover: () => decisions.current.recover(), discard: () => decisions.current.discard() } : null);
  }, [checked, recovery, registerRecovery, section]);
  const markSaved = useCallback((values: FormDraftValues) => {
    baseline.current = values;
    dirtyRef.current = false; recoveringRef.current = false;
    setDirty(false); setRecovery(null); setSavedLocally(false);
    remove(); report(section, false);
  }, [remove, report, section]);
  return { formRef, dirty, markSaved, saveLocal: () => persist(true), feedback: <>
    {warning && <Notice tone="error" role="alert">Não foi possível acessar o armazenamento local. Continue editando, mas não conte com a recuperação após sair ou recarregar.</Notice>}
    {savedLocally && <Notice role="status">Rascunho neste navegador. Nada foi salvo no servidor nem emitido.</Notice>}
    {recovery && !registerRecovery && <FormDraftRecovery onRecover={recover} onDiscard={discard} onDone={() => formRef.current?.querySelector<HTMLElement>('input:not([type="hidden"]), select, textarea')?.focus()} />}
  </> };
}

export function FormDraftRecovery({ onRecover, onDiscard, onDone, campaign = false, busy = false, conflict = false, error = false }: { onRecover: () => void; onDiscard: () => void; onDone: () => void; campaign?: boolean; busy?: boolean; conflict?: boolean; error?: boolean }) {
  const dark = useDarkTheme();
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  return <AlertDialog.Root open><AlertDialog.Portal>
    <AlertDialog.Overlay className="ws-client-dialog-overlay" />
    <AlertDialog.Content className={`ui-scope ws-recovery-dialog ${dark ? 'dark' : ''}`} onEscapeKeyDown={event => { event.preventDefault(); setConfirmDiscard(false); }} onCloseAutoFocus={event => { event.preventDefault(); onDone(); }}>
      <header><AlertDialog.Title>{confirmDiscard ? 'Descartar este rascunho?' : 'Recuperar rascunho neste navegador?'}</AlertDialog.Title>
        <AlertDialog.Description>{confirmDiscard ? 'Isso remove somente o rascunho local. Os dados do servidor não serão alterados.' : campaign ? 'Há alterações locais nesta campanha. Recuperar carrega de uma vez os rascunhos de todas as abas para revisão; não envia arquivos, não salva no servidor nem emite cobrança.' : 'Há valores não salvos nesta aba. Recuperar preenche o formulário para revisão; não salva no servidor nem emite cobrança.'}</AlertDialog.Description></header>
      <p className="ws-recovery-hint">O rascunho pode ser perdido ao fechar a aba ou limpar o armazenamento. Confira os valores antes de salvar ou emitir.</p>
      {conflict && <Notice tone="error">A configuração no servidor mudou. O rascunho visual pode ser recuperado para conferência, mas não poderá sobrescrever a versão salva.</Notice>}
      {error && <Notice tone="error">Não foi possível concluir a operação local. Tente novamente.</Notice>}
      <fieldset disabled={busy}><footer>{confirmDiscard ? <><Action variant="secondary" onClick={() => setConfirmDiscard(false)}>Voltar</Action><Action variant="danger" onClick={onDiscard}>Descartar rascunho</Action></> : <><Action variant="secondary" onClick={() => setConfirmDiscard(true)}>Descartar</Action><Action onClick={onRecover}>Recuperar rascunho</Action></>}</footer></fieldset>
    </AlertDialog.Content>
  </AlertDialog.Portal></AlertDialog.Root>;
}
