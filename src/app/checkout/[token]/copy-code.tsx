'use client';
import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
export function CopyCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(false);
  return <div className="checkout-copy"><button type="button" className="button" onClick={async () => {
    setCopied(false); setError(false);
    try { await navigator.clipboard.writeText(code); setCopied(true); }
    catch { setError(true); }
  }}>{copied ? <Check size={18} aria-hidden /> : <Copy size={18} aria-hidden />}{copied ? 'Código Pix copiado' : 'Copiar código Pix'}</button><span className="checkout-sr-only" role="status">{copied ? 'Código Pix copiado.' : ''}</span>{error && <p className="error" role="alert">Selecione o código acima e copie manualmente.</p>}</div>;
}
