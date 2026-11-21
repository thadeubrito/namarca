export function campaignAvailability({ published, suspended, endsAt, pending = false }: { published: boolean; suspended: boolean; endsAt?: string; pending?: boolean }, now = Date.now()) {
  if (!published) return pending ? 'Publicação pendente' : 'Rascunho';
  if (endsAt && Date.parse(endsAt) <= now) return 'Encerrada';
  return suspended ? 'Suspensa' : 'Ativa';
}
