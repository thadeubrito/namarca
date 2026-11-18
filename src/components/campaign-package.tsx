'use client';
import { useActionState } from 'react';
import { approvePackage } from '@/app/admin/campanhas/[id]/package-actions';
export function PackageApprovalForm({ campaignId, revision, identity }: { campaignId: string; revision: number; identity: string }) {
  const [state, action, pending] = useActionState(approvePackage.bind(null, campaignId), {});
  return <form action={action} className="stack" data-campaign-approval="true">
    <input type="hidden" name="revision" value={revision} /><input type="hidden" name="identity" value={identity} />
    <div className="grid"><label>Responsável pela aprovação<input name="approvedBy" maxLength={200} required /></label><label>Canal da aprovação<select name="channel" required><option value="whatsapp">WhatsApp</option><option value="email">E-mail</option><option value="presencial">Presencial</option><option value="outro">Outro</option></select></label></div>
    <label>Data da aprovação<input name="approvedAt" type="date" required max={new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' })} /></label>
    <label className="approval-consent"><input name="rights" type="checkbox" required /><span>Confirmo a autorização de uso dos materiais e a aprovação desta versão.</span></label>
    <p className="muted">Registre somente após revisar a prévia e receber a aprovação. Isso preserva a configuração salva; não é aprovação comercial nem publicação.</p>
    <button disabled={pending}>{pending ? 'Registrando…' : 'Registrar aprovação do pacote'}</button>
    {state.error && <p className="error" role="alert">{state.error}</p>}{state.success && <p className="notice" role="status">{state.success}</p>}
  </form>;
}
