'use client';

import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { WorkspaceTabs } from './primitives';
import { CampaignStudio } from './studio';
import { CampaignRecovery } from './campaign-recovery';

const SectionStatus = createContext<(section: string, pending: boolean) => void>(() => {});
export const useCampaignSectionStatus = () => useContext(SectionStatus);
const PublicationLock = createContext<(busy: boolean) => void>(() => {});
export const usePublicationLock = () => useContext(PublicationLock);
const CampaignPending = createContext(false);
export const useCampaignPending = () => useContext(CampaignPending);
const CampaignAnyPending = createContext(false);
export const useCampaignAnyPending = () => useContext(CampaignAnyPending);
const ActiveSection = createContext<string | undefined>(undefined);
export const useCampaignActiveSection = () => useContext(ActiveSection);

export function CampaignSections({ campaignId, editable, details, billing, billingDraft, publication }: { campaignId: string; editable: boolean; details: ReactNode; billing: ReactNode; billingDraft: boolean; publication?: ReactNode }) {
  const [publishing, setPublishing] = useState(false);
  const [active, setActive] = useState('dados');
  const [pending, setPending] = useState<Record<string, boolean>>({});
  const report = useCallback((section: string, value: boolean) => setPending(current => current[section] === value ? current : { ...current, [section]: value }), []);
  const publicDirty = ['dados', 'artes', 'stickers', 'cores'].some(section => pending[section]);
  const studio = <CampaignStudio campaignId={campaignId} activeSection={active} onPendingChange={report} />;
  return <PublicationLock.Provider value={setPublishing}><CampaignPending.Provider value={publicDirty}><CampaignAnyPending.Provider value={Object.values(pending).some(Boolean)}><SectionStatus.Provider value={report}><ActiveSection.Provider value={active}><CampaignRecovery expected={[...(editable ? ['dados', 'studio'] : []), ...(billingDraft ? ['cobranca'] : [])]}><div className="ws-campaign-workbench" data-section={active}><div className="ws-campaign-task" inert={publishing} aria-busy={publishing}><WorkspaceTabs label="Seções da campanha" initialId="dados" layout="workbench" activeId={active} onActiveChange={setActive} items={[
    { id: 'dados', label: 'Detalhes', pending: pending.dados, content: details },
    ...(editable ? [
      { id: 'artes', label: 'Artes', panelKey: 'visual', lazy: false, pending: pending.artes, content: studio },
      { id: 'stickers', label: 'Figurinhas', panelKey: 'visual', lazy: true, pending: pending.stickers, content: studio },
      { id: 'cores', label: 'Cores', panelKey: 'visual', lazy: true, pending: pending.cores, content: studio },
    ] : []),
    { id: 'cobranca', label: 'Cobrança', pending: pending.cobranca, content: billing },
    ...(publication ? [{ id: 'publicacao', label: 'Publicação', content: publication }] : []),
  ]} /></div></div></CampaignRecovery></ActiveSection.Provider></SectionStatus.Provider></CampaignAnyPending.Provider></CampaignPending.Provider></PublicationLock.Provider>;
}
