'use client';
import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { approvePackage } from '@/app/admin/campanhas/[id]/package-actions';
export function PackageApprovalForm({ campaignId, revision, identity }: { campaignId: string; revision: number; identity: string }) {
  const [state, action, pending] = useActionState(approvePackage.bind(null, campaignId), {});
  return <form action={action} className="min-w-0" data-campaign-approval="true">
    <input type="hidden" name="revision" value={revision} /><input type="hidden" name="identity" value={identity} />
    <Card className="gap-5">
      <CardHeader className="border-b max-md:px-4">
        <CardTitle className="text-base">Registrar aprovação</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 max-md:px-4 lg:grid-cols-2">
        <div className="min-w-0 space-y-4 rounded-lg border p-4">
          <h3 className="text-sm font-semibold">Dados da aprovação</h3>
          <label className="grid gap-2">Responsável pela aprovação<Input type="text" name="approvedBy" maxLength={200} required /></label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid content-start gap-2">Canal da aprovação<select name="channel" required><option value="whatsapp">WhatsApp</option><option value="email">E-mail</option><option value="presencial">Presencial</option><option value="outro">Outro</option></select></label>
            <label className="grid content-start gap-2">Data da aprovação<Input name="approvedAt" type="date" required max={new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' })} /></label>
          </div>
        </div>
        <div className="min-w-0 space-y-4 rounded-lg border bg-muted/30 p-4">
          <h3 className="text-sm font-semibold">Autorização de uso</h3>
          <label className="approval-consent"><input name="rights" type="checkbox" required /><span>Confirmo a autorização de uso dos materiais e a aprovação desta versão.</span></label>
          <p className="text-sm text-muted-foreground">Registre após revisar a prévia e receber a aprovação. A versão salva será preservada; isso não aprova condições comerciais nem publica a campanha.</p>
        </div>
      </CardContent>
      <CardFooter className="flex-col items-stretch gap-3 border-t max-md:px-4">
        {state.error && <p className="error" role="alert">{state.error}</p>}{state.success && <p className="notice" role="status">{state.success}</p>}
        <div className="flex justify-end"><Button className="max-sm:w-full" type="submit" disabled={pending}>{pending ? 'Registrando…' : 'Registrar aprovação do pacote'}</Button></div>
      </CardFooter>
    </Card>
  </form>;
}
