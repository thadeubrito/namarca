'use client';

import { useState } from 'react';
import { Dialog } from 'radix-ui';
import { Plus, X } from 'lucide-react';
import { useDarkTheme } from '@/components/theme-scope';
import { CampaignCreateForm } from './campaign-create-form';
import { Action } from './primitives';

export function CampaignCreateDialog() {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const dark = useDarkTheme();
  return <Dialog.Root open={open} onOpenChange={value => { if (!pending) setOpen(value); }}>
    <Dialog.Trigger asChild><button type="button" className="ws-action ws-action-primary"><Plus aria-hidden size={16} />Criar campanha</button></Dialog.Trigger>
    <Dialog.Portal>
      <Dialog.Overlay className="ws-client-dialog-overlay" />
      <Dialog.Content className={`ui-scope workspace ws-client-dialog ${dark ? 'dark' : ''}`} onInteractOutside={event => event.preventDefault()}>
        <header className="ws-campaign-create-heading"><div><Dialog.Title>Criar campanha</Dialog.Title><Dialog.Description>Comece pelo evento. Cliente, observações e materiais ficam para a próxima etapa.</Dialog.Description></div><Dialog.Close asChild><button type="button" className="ws-action ws-action-ghost ws-campaign-create-close" disabled={pending} aria-label="Fechar criação de campanha"><X aria-hidden size={20} /></button></Dialog.Close></header>
        <CampaignCreateForm onPendingChange={setPending} cancel={<Action variant="ghost" disabled={pending} onClick={() => setOpen(false)}>Cancelar</Action>} />
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>;
}
