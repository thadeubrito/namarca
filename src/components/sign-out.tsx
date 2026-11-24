'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { authClient } from '@/lib/auth-client';
export function SignOut() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  return <div><Button type="button" variant="ghost" disabled={busy} onClick={async () => {
    setBusy(true); setError('');
    try { const result = await authClient.signOut(); if (result.error) throw new Error(); window.location.assign('/login'); }
    catch { setError('Não foi possível sair. Tente novamente.'); setBusy(false); }
  }}>{busy ? 'Saindo…' : 'Sair'}</Button>{error && <p role="alert">{error}</p>}</div>;
}
