'use client';

import { useActionState, useEffect, useState } from 'react';
import { Dialog } from 'radix-ui';
import { Plus, X } from 'lucide-react';
import { saveClient } from '@/app/(workspace)/clientes/actions';
import { Action, Field, Notice, TextInput } from './primitives';
import { useDarkTheme } from '@/components/theme-scope';

export function ClientCreateDialog() {
  const [open, setOpen] = useState(false);
  const dark = useDarkTheme();
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, [open]);
  return <Dialog.Root open={open} onOpenChange={setOpen}>
    <Dialog.Trigger asChild><button type="button" className="ws-action ws-action-primary"><Plus aria-hidden className="size-4" />Novo cliente</button></Dialog.Trigger>
    <Dialog.Portal>
      <Dialog.Overlay className="ws-client-dialog-overlay" />
      <Dialog.Content className={`ui-scope workspace ws-client-dialog ${dark ? 'dark' : ''}`} aria-describedby="client-create-description" onOpenAutoFocus={event => { event.preventDefault(); document.querySelector<HTMLInputElement>('[role="dialog"] input[name="name"]')?.focus(); }} onInteractOutside={event => event.preventDefault()}>
        <header className="flex items-start justify-between gap-4"><div><Dialog.Title className="!text-xl">Novo cliente</Dialog.Title><Dialog.Description id="client-create-description" className="mt-2 text-sm text-muted-foreground">Cadastre um nome e um contato de referência.</Dialog.Description></div><Dialog.Close asChild><button type="button" className="ws-action ws-action-ghost !size-10 !p-0" aria-label="Fechar cadastro de cliente"><X aria-hidden /></button></Dialog.Close></header>
        <CreateForm close={() => setOpen(false)} />
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>;
}
function CreateForm({ close }: { close: () => void }) {
  const [state, action, pending] = useActionState(saveClient.bind(null, null), {});
  return <form action={action} className="space-y-5" aria-busy={pending}>
    <Field label="Nome do cliente"><TextInput name="name" required minLength={2} maxLength={160} autoComplete="organization" placeholder="Pessoa ou organização" /></Field>
    <Field label="Contato" hint="Opcional · e-mail ou WhatsApp"><TextInput name="contact" maxLength={254} placeholder="Como entrar em contato" /></Field>
    {state.error && <Notice tone="error">{state.error}</Notice>}
    <footer className="flex justify-end gap-2 border-t pt-5"><Action variant="ghost" onClick={close} disabled={pending}>Cancelar</Action><Action type="submit" disabled={pending}>{pending ? 'Salvando…' : 'Cadastrar cliente'}</Action></footer>
  </form>;
}
