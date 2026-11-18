'use client';
import { useState } from 'react';
export function CopyCode({ code }: { code: string }) {
  const [message, setMessage] = useState('');
  return <div><button className="button secondary" onClick={async () => { try { await navigator.clipboard.writeText(code); setMessage('Código Pix copiado.'); } catch { setMessage('Selecione o código acima para copiar manualmente.'); } }}>Copiar código Pix</button>{message && <p role="status">{message}</p>}</div>;
}
