'use client';

import { useSyncExternalStore, useState, type FormEvent } from 'react';
const subscribeHydration = () => () => {};
const hydratedSnapshot = () => true;
const serverSnapshot = () => false;
import Link from 'next/link';
import { authClient } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Brand } from '@/components/brand';
import { ThemeScope, ThemeToggle } from '@/components/theme-scope';

export function AuthPanel({ mode, bootstrapUnavailable = false }: { mode: 'login' | 'verify' | 'setup' | 'bootstrap'; bootstrapUnavailable?: boolean }) {
  const ready = useSyncExternalStore(subscribeHydration, hydratedSnapshot, serverSnapshot);
  const [created, setCreated] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [setup, setSetup] = useState<{ totpURI: string; backupCodes: string[] } | null>(null);
  const [qr, setQr] = useState('');
  const [recovery, setRecovery] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(''); setBusy(true);
    const form = event.currentTarget;
    const data = new FormData(form);
    try {
      if (mode === 'bootstrap') {
        const result = await fetch('/api/auth/bootstrap', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, cache: 'no-store',
          body: JSON.stringify({ key: String(data.get('key')), password: String(data.get('password')), passwordConfirmation: String(data.get('passwordConfirmation')) }),
        });
        if (!result.ok) throw new Error('Não foi possível concluir o primeiro acesso.');
        form.reset();
        setCreated(true);
      } else if (mode === 'login') {
        const result = await authClient.signIn.email({ email: String(data.get('email')), password: String(data.get('password')) });
        if (result.error) throw new Error('Não foi possível entrar. Confira suas credenciais.');
        const twoFactor = result.data && 'twoFactorRedirect' in result.data && result.data.twoFactorRedirect;
        window.location.assign(twoFactor ? '/login/verificar' : '/');
      } else if (mode === 'setup' && !setup) {
        const result = await authClient.twoFactor.enable({ password: String(data.get('password')), issuer: 'Namarca' });
        if (result.error || !result.data || !('totpURI' in result.data)) throw new Error('Não foi possível configurar o segundo fator. Confira sua senha.');
        setSetup(result.data);
        const QRCode = await import('qrcode');
        setQr(await QRCode.toDataURL(result.data.totpURI, { width: 256, margin: 2 }));
      } else {
        const code = String(data.get('code')).trim();
        const result = recovery
          ? await authClient.twoFactor.verifyBackupCode({ code, disableSession: false })
          : await authClient.twoFactor.verifyTotp({ code, trustDevice: false });
        if (result.error) throw new Error('Código inválido ou expirado. Tente novamente.');
        window.location.assign('/');
      }
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Operação indisponível. Tente novamente.'); }
    finally { setBusy(false); }
  }

  return <ThemeScope className="auth-scope"><div className="auth-toolbar"><ThemeToggle /></div><div className="auth-layout">
    <aside className="auth-brand"><Brand href="/login" /><div><p className="eyebrow">Administração de campanhas</p><h2>O evento começa<br />antes da largada.</h2><p>Prepare a ativação. Organize a entrega. Acompanhe cada campanha em um só lugar.</p></div><small>Acesso exclusivo da equipe Namarca.</small></aside>
    <main className="auth-form" id="conteudo"><div className="auth-card">
      <div className="auth-logo"><Brand href="/login" /></div>
      <p className="eyebrow">Área administrativa</p>
      <h1>{mode === 'bootstrap' ? 'Primeiro acesso' : mode === 'login' ? 'Entre na sua conta' : mode === 'setup' ? 'Proteja seu acesso' : 'Confirme seu acesso'}</h1>
      <p className="muted">{mode === 'bootstrap' ? 'Crie a senha da conta administrativa configurada. Depois, entre e configure o autenticador obrigatório.' : mode === 'login' ? 'Use as credenciais da conta provisionada para você.' : mode === 'setup' ? 'Configure um aplicativo autenticador. O segundo fator é obrigatório.' : 'Informe o código do seu autenticador para concluir o login.'}</p>
      {bootstrapUnavailable ? <div role="status"><p>Primeiro acesso indisponível.</p><Link href="/login" prefetch={false}>Voltar ao login</Link></div> : created ? <div role="status"><p>Senha criada. Entre para configurar o segundo fator obrigatório.</p><Link href="/login" prefetch={false}>Ir para o login</Link></div> : <form method="post" action="/api/auth/form-unavailable" onSubmit={submit}>
        <noscript><p role="alert">Ative o JavaScript para entrar. Nenhuma credencial será enviada pela URL.</p></noscript>
        {mode === 'bootstrap' && <><label>Chave de primeiro acesso<Input name="key" type="password" autoComplete="off" required maxLength={1024} /></label><label>Nova senha<Input name="password" type="password" autoComplete="new-password" required minLength={8} maxLength={128} /></label><label>Confirme a nova senha<Input name="passwordConfirmation" type="password" autoComplete="new-password" required minLength={8} maxLength={128} /></label></>}
        {mode === 'login' && <><label>E-mail<Input name="email" type="email" autoComplete="username" required maxLength={254} /></label><label>Senha<Input name="password" type="password" autoComplete="current-password" required maxLength={128} /></label></>}
        {mode === 'setup' && !setup && <label>Confirme sua senha<Input name="password" type="password" autoComplete="current-password" required maxLength={128} /></label>}
        {setup && <><div className="notice">Escaneie o QR Code com seu autenticador.</div>{qr && <img className="qr" src={qr} alt="QR Code para configurar o autenticador Namarca" width={256} height={256} />}<details><summary>Configurar manualmente</summary><code className="secret">{setup.totpURI}</code></details><div><h2>Códigos de recuperação</h2><p className="muted">Guarde fora deste navegador. Cada código funciona uma única vez.</p><code className="secret">{setup.backupCodes.join('\n')}</code></div><label className="row" style={{ fontWeight: 400 }}><Input type="checkbox" checked={acknowledged} onChange={e => setAcknowledged(e.target.checked)} style={{ width: 20, minHeight: 20 }} />Guardei os códigos em local seguro.</label></>}
        {(mode === 'verify' || setup) && <label>{recovery ? 'Código de recuperação' : 'Código de seis dígitos'}<Input name="code" type="text" autoComplete="one-time-code" inputMode={recovery ? 'text' : 'numeric'} pattern={recovery ? undefined : '[0-9]{6}'} maxLength={recovery ? 100 : 6} required /></label>}
        {error && <div className="error" role="alert">{error}</div>}
        <Button disabled={!ready || busy || (!!setup && !acknowledged)}>{!ready ? 'Carregando formulário…' : busy ? 'Aguarde…' : mode === 'bootstrap' ? 'Criar senha' : mode === 'login' ? 'Entrar no administrativo' : mode === 'setup' && !setup ? 'Configurar autenticador' : 'Verificar código'}</Button>
        {mode === 'verify' && <Button type="button" variant="outline" onClick={() => { setRecovery(!recovery); setError(''); }}>{recovery ? 'Usar código do autenticador' : 'Usar código de recuperação'}</Button>}
      </form>}
      {mode === 'login' && <p><Link href="/login/primeiro-acesso" prefetch={false}>Primeiro acesso</Link></p>}
      <footer>Não há cadastro público. Se perdeu o acesso, utilize os códigos de recuperação ou o procedimento administrativo.</footer>
    </div></main>
  </div></ThemeScope>;
}
