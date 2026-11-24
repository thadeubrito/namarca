'use client';

import { useEffect, useRef, useState } from 'react';
import { Check } from 'lucide-react';

/** Only an acknowledged server save may provide a success token. */
export function SaveStatus({ dirty, saving = false, successToken }: { dirty: boolean; saving?: boolean; successToken?: string }) {
  const [visibleToken, setVisibleToken] = useState<string>();
  const shownToken = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (dirty || saving) {
      queueMicrotask(() => setVisibleToken(undefined));
      return;
    }
    if (!successToken || shownToken.current === successToken) return;
    shownToken.current = successToken;
    let active = true;
    queueMicrotask(() => { if (active) setVisibleToken(successToken); });
    const timer = setTimeout(() => setVisibleToken(undefined), 3500);
    return () => { active = false; clearTimeout(timer); };
  }, [successToken, dirty, saving]);
  const saved = !dirty && !saving && !!successToken && visibleToken === successToken;
  return <span className="ws-save-status" role="status" aria-live="polite">{saving ? 'Salvando…' : dirty ? 'Alterações não salvas' : saved ? <><Check aria-hidden size={14} />Salvo</> : <span aria-hidden="true">{'\u00a0'}</span>}</span>;
}
