'use client';

import { useId, useState, type ReactNode, type KeyboardEvent } from 'react';
import { flushSync } from 'react-dom';
import './campaign-sections.css';

type Item = { id: string; label: string; content: ReactNode };

/** Keep panels mounted: changing section must not discard forms or the local editor. */
export function CampaignSections({ label, items, initialId }: { label: string; items: Item[]; initialId?: string }) {
  const prefix = useId();
  const [active, setActive] = useState(initialId ?? items[0]?.id);
  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let next = index;
    if (event.key === 'ArrowRight') next = (index + 1) % items.length;
    else if (event.key === 'ArrowLeft') next = (index - 1 + items.length) % items.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = items.length - 1;
    else return;
    event.preventDefault();
    setActive(items[next].id);
    const tab = document.getElementById(`${prefix}-tab-${items[next].id}`);
    tab?.focus({ preventScroll: true });
    tab?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  };
  return <div className="campaign-sections">
    <div className="campaign-section-nav" role="tablist" aria-label={label}>
      {items.map((item, index) => <button key={item.id} type="button" role="tab" id={`${prefix}-tab-${item.id}`} aria-controls={`${prefix}-panel-${item.id}`} aria-selected={active === item.id} tabIndex={active === item.id ? 0 : -1} onClick={() => setActive(item.id)} onKeyDown={event => onKeyDown(event, index)}>{item.label}</button>)}
    </div>
    {items.map(item => <div key={item.id} role="tabpanel" id={`${prefix}-panel-${item.id}`} aria-labelledby={`${prefix}-tab-${item.id}`} hidden={active !== item.id} tabIndex={0} onInvalidCapture={() => { flushSync(() => setActive(item.id)); }}>{item.content}</div>)}
  </div>;
}
