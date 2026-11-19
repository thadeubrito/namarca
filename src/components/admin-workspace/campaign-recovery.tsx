'use client';

import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { FormDraftRecovery } from './form-draft';

type Recovery = { recover: () => void; discard: () => void | Promise<void>; conflict?: boolean };
type Register = (section: string, recovery: Recovery | null) => void;
const RecoveryContext = createContext<Register | null>(null);
export const useCampaignRecovery = () => useContext(RecoveryContext);

export function CampaignRecovery({ expected, children }: { expected: string[]; children: ReactNode }) {
  const [entries, setEntries] = useState<Record<string, Recovery | null>>({});
  const [working, setWorking] = useState(false);
  const [error, setError] = useState(false);
  const register = useCallback<Register>((section, recovery) => setEntries(current => ({ ...current, [section]: recovery })), []);
  const pending = Object.values(entries).filter((entry): entry is Recovery => !!entry);
  const ready = expected.every(section => section in entries);
  async function decide(discard: boolean) {
    setWorking(true); setError(false);
    try {
      for (const entry of pending) await (discard ? entry.discard() : entry.recover());
    } catch { setError(true); }
    finally { setWorking(false); }
  }
  return <RecoveryContext.Provider value={register}>{children}{ready && pending.length > 0 && <FormDraftRecovery campaign busy={working} conflict={pending.some(entry => entry.conflict)} error={error} onRecover={() => void decide(false)} onDiscard={() => void decide(true)} onDone={() => document.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]')?.focus()} />}</RecoveryContext.Provider>;
}
