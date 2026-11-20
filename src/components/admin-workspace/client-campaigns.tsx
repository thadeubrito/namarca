import Link from 'next/link';
import { ArrowUpRight, CalendarDays, Folder } from 'lucide-react';
import { Pill, Surface } from './primitives';
import { ClientEmpty } from './client-motion';

// Real composition reference: https://paceui.com/r/app-project-3.json.
// Adapted badge/header → project title → identity/date footer; no demo assignees or fake statuses.
export function ClientCampaigns({ campaigns, clientName }: { campaigns: { id: string; name: string; endsAt: string }[]; clientName: string }) {
  return <section className="min-w-0" aria-label="Campanhas do cliente">
    <div className="mb-5 flex items-center gap-3"><h2 className="text-lg font-semibold">Campanhas</h2><Pill>{campaigns.length}</Pill></div>
    {campaigns.length ? <div className="grid gap-4 md:grid-cols-2">{campaigns.map(campaign => <Link key={campaign.id} href={`/admin/campanhas/${campaign.id}`} className="group min-w-0 rounded-xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring motion-safe:transition-transform motion-safe:hover:-translate-y-0.5">
      <Surface className="flex h-full flex-col gap-6 p-6">
        <div className="flex items-center justify-between gap-3"><Pill>Campanha vinculada</Pill><ArrowUpRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" /></div>
        <h3 className="flex-1 break-words text-lg font-semibold leading-snug [overflow-wrap:anywhere]">{campaign.name}</h3>
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border pt-4">
          <div className="flex min-w-0 items-center gap-2"><span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted"><Folder className="size-4" aria-hidden="true" /></span><span className="min-w-0 break-words text-xs text-muted-foreground [overflow-wrap:anywhere]">{clientName}</span></div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground"><CalendarDays className="size-4" aria-hidden="true" /><span>Encerramento<br /><span className="font-medium text-foreground">{campaign.endsAt}</span></span></div>
        </div>
      </Surface>
    </Link>)}</div> : <Surface><ClientEmpty title="Nenhuma campanha vinculada." description="As campanhas associadas a este cliente aparecerão aqui." /></Surface>}
  </section>;
}
