'use client';

import { useSyncExternalStore, useState, type FormEvent } from 'react';
const subscribeHydration = () => () => {};
const hydratedSnapshot = () => true;
const serverSnapshot = () => false;
import { authClient } from '@/lib/auth-client';

export function AuthPanel({ mode }: { mode: 'login' | 'verify' | 'setup' }) {
  const ready = useSyncExternalStore(subscribeHydration, hydratedSnapshot, serverSnapshot);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [setup, setSetup] = useState<{ totpURI: string; backupCodes: string[] } | null>(null);
  const [qr, setQr] = useState('');
  const [recovery, setRecovery] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(''); setBusy(true);
    const data = new FormData(event.currentTarget);
    try {
      if (mode === 'login') {
        const result = await authClient.signIn.email({ email: String(data.get('email')), password: String(data.get('password')) });
        if (result.error) throw new Error('Não foi possível entrar. Confira suas credenciais.');
        const twoFactor = result.data && 'twoFactorRedirect' in result.data && result.data.twoFactorRedirect;
        window.location.assign(twoFactor ? '/login/verificar' : '/admin');
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
        window.location.assign('/admin');
      }
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Operação indisponível. Tente novamente.'); }
    finally { setBusy(false); }
  }

  return <div className="auth-layout">
    <aside className="auth-brand"><span className="wordmark">namarca</span><div><p className="eyebrow" style={{ color: '#c5ee59' }}>Administração de campanhas</p><h2>O evento começa<br />antes da largada.</h2><p>Prepare a ativação. Organize a entrega. Acompanhe cada campanha em um só lugar.</p></div><small style={{ color: '#c4d0c1' }}>Acesso exclusivo da equipe Namarca.</small></aside>
    <main className="auth-form" id="conteudo"><div className="auth-card">
      <span className="wordmark login-mark">namarca</span>
      <p className="eyebrow">Área administrativa</p>
      <h1>{mode === 'login' ? 'Entre na sua conta' : mode === 'setup' ? 'Proteja seu acesso' : 'Confirme seu acesso'}</h1>
      <p className="muted">{mode === 'login' ? 'Use as credenciais da conta provisionada para você.' : mode === 'setup' ? 'Configure um aplicativo autenticador. O segundo fator é obrigatório.' : 'Informe o código do seu autenticador para concluir o login.'}</p>
      <form method="post" action="/api/auth/form-unavailable" onSubmit={submit}>
        <noscript><p role="alert">Ative o JavaScript para entrar. Nenhuma credencial será enviada pela URL.</p></noscript>
        {mode === 'login' && <><label>E-mail<input name="email" type="email" autoComplete="username" required maxLength={254} /></label><label>Senha<input name="password" type="password" autoComplete="current-password" required maxLength={128} /></label></>}
        {mode === 'setup' && !setup && <label>Confirme sua senha<input name="password" type="password" autoComplete="current-password" required maxLength={128} /></label>}
        {setup && <><div className="notice">Escaneie o QR Code com seu autenticador.</div>{qr && <img className="qr" src={qr} alt="QR Code para configurar o autenticador Namarca" width={256} height={256} />}<details><summary>Configurar manualmente</summary><code className="secret">{setup.totpURI}</code></details><div><h2>Códigos de recuperação</h2><p className="muted">Guarde fora deste navegador. Cada código funciona uma única vez.</p><code className="secret">{setup.backupCodes.join('\n')}</code></div><label className="row" style={{ fontWeight: 400 }}><input type="checkbox" checked={acknowledged} onChange={e => setAcknowledged(e.target.checked)} style={{ width: 20, minHeight: 20 }} />Guardei os códigos em local seguro.</label></>}
        {(mode === 'verify' || setup) && <label>{recovery ? 'Código de recuperação' : 'Código de seis dígitos'}<input name="code" type="text" autoComplete="one-time-code" inputMode={recovery ? 'text' : 'numeric'} pattern={recovery ? undefined : '[0-9]{6}'} maxLength={recovery ? 100 : 6} required /></label>}
        {error && <div className="error" role="alert">{error}</div>}
        <button disabled={!ready || busy || (!!setup && !acknowledged)}>{!ready ? 'Carregando formulário…' : busy ? 'Aguarde…' : mode === 'login' ? 'Entrar no administrativo' : mode === 'setup' && !setup ? 'Configurar autenticador' : 'Verificar código'}</button>
        {mode === 'verify' && <button type="button" className="secondary" onClick={() => { setRecovery(!recovery); setError(''); }}>{recovery ? 'Usar código do autenticador' : 'Usar código de recuperação'}</button>}
      </form>
      <footer>Não há cadastro público. Se perdeu o acesso, utilize os códigos de recuperação ou o procedimento administrativo.</footer>
    </div></main>
  </div>;
}
