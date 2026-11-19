'use client';

import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { WorkspaceTabs } from './primitives';
import { CampaignStudio } from './studio';
import { CampaignRecovery } from './campaign-recovery';

const SectionStatus = createContext<(section: string, pending: boolean) => void>(() => {});
export const useCampaignSectionStatus = () => useContext(SectionStatus);
const ActiveSection = createContext<string | undefined>(undefined);
export const useCampaignActiveSection = () => useContext(ActiveSection);

export function CampaignSections({ campaignId, editable, details, billing, billingDraft }: { campaignId: string; editable: boolean; details: ReactNode; billing: ReactNode; billingDraft: boolean }) {
  const [active, setActive] = useState('dados');
  const [pending, setPending] = useState<Record<string, boolean>>({});
  const report = useCallback((section: string, value: boolean) => setPending(current => current[section] === value ? current : { ...current, [section]: value }), []);
  const studio = <CampaignStudio campaignId={campaignId} activeSection={active} onPendingChange={report} />;
  return <SectionStatus.Provider value={report}><ActiveSection.Provider value={active}><CampaignRecovery expected={[...(editable ? ['dados', 'studio'] : []), ...(billingDraft ? ['cobranca'] : [])]}><WorkspaceTabs label="Seções da campanha" initialId="dados" activeId={active} onActiveChange={setActive} items={[
    { id: 'dados', label: 'Detalhes', pending: pending.dados, content: details },
    ...(editable ? [
      { id: 'artes', label: 'Artes', panelKey: 'visual', lazy: false, pending: pending.artes, content: studio },
      { id: 'stickers', label: 'Figurinhas', panelKey: 'visual', lazy: true, pending: pending.stickers, content: studio },
      { id: 'cores', label: 'Cores', panelKey: 'visual', lazy: true, pending: pending.cores, content: studio },
    ] : []),
    { id: 'cobranca', label: 'Cobrança', pending: pending.cobranca, content: billing },
  ]} /></CampaignRecovery></ActiveSection.Provider></SectionStatus.Provider>;
}
