'use client';

import { useEffect, useState } from 'react';
import { Clock3 } from 'lucide-react';
import { formatPixCountdown, pixRemainingSeconds } from '@/lib/pix-countdown';

export function PixCountdown({ expiresAt }: { expiresAt: string }) {
  const [seconds, setSeconds] = useState<number | null>(null);
  useEffect(() => {
    const update = () => setSeconds(pixRemainingSeconds(expiresAt, Date.now()));
    update();
    const interval = window.setInterval(update, 1000);
    document.addEventListener('visibilitychange', update);
    return () => { window.clearInterval(interval); document.removeEventListener('visibilitychange', update); };
  }, [expiresAt]);
  const ended = seconds === 0;
  return <div className="checkout-countdown" data-ended={ended}>
    <Clock3 size={14} aria-hidden />
    <span>{ended ? 'Prazo encerrado' : 'Expira em'}</span>
    {!ended && <span role="timer" aria-label="Tempo restante para pagar" aria-live="off" className="checkout-countdown-value">{seconds === null ? '—:—' : formatPixCountdown(seconds)}</span>}
    <span className="checkout-sr-only" role="status">{ended ? 'O prazo do Pix terminou. Atualize a situação para verificar o pagamento.' : ''}</span>
  </div>;
}
