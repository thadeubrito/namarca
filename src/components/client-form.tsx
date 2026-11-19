'use client';
import Link from 'next/link';
import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { saveClient, type ClientState } from '@/app/admin/clientes/actions';

export function ClientForm({ client }: { client?: { id: string; name: string; contact: string } }) {
  const [state, action, pending] = useActionState<ClientState, FormData>(saveClient.bind(null, client?.id ?? null), {});
  return <form action={action} className="min-w-0">
    <Card className="gap-5">
      <CardHeader className="border-b max-md:px-4">
        <CardTitle className="text-base">Dados do cliente</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 max-md:px-4">
        <div className="grid gap-4 rounded-lg border p-4 md:grid-cols-2">
          <label className="grid content-start gap-2">Nome do cliente<Input type="text" name="name" required minLength={2} maxLength={160} defaultValue={client?.name ?? ''} autoComplete="organization" /></label>
          <label className="grid content-start gap-2">Contato <small>Opcional · e-mail ou WhatsApp</small><Input type="text" name="contact" maxLength={254} defaultValue={client?.contact ?? ''} /></label>
        </div>
        {client && <p className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">Altera o cliente em todas as campanhas vinculadas, sem mudar valores ou cobranças emitidas.</p>}
        {state.error && <p role="alert">{state.error}</p>}
      </CardContent>
      <CardFooter className="justify-end gap-2 border-t max-md:flex-col max-md:items-stretch max-md:px-4">
        <Button type="submit" disabled={pending}>{pending ? 'Salvando…' : client ? 'Salvar cliente' : 'Cadastrar cliente'}</Button>
        <Button type="button" variant="ghost" asChild><Link href="/admin/clientes">Clientes</Link></Button>
      </CardFooter>
    </Card>
  </form>;
}
