import { Brand } from '@/components/brand';
import { notFound } from 'next/navigation';
import { desc, eq } from 'drizzle-orm';
import QRCode from 'qrcode';
import { db } from '@/db';
import { payments, checkoutAttempts } from '@/db/schema';
import { getCheckout, requireMockCheckout } from '@/lib/checkout';
import { CheckoutForm } from './form';
import { CopyCode } from './copy-code';
import { PixCountdown } from './pix-countdown';
import './checkout.css';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Pagamento', robots: { index: false, follow: false }, referrer: 'no-referrer' as const };

export default async function CheckoutPage({ params }: { params: Promise<{ token: string }> }) {
  try { requireMockCheckout(); } catch { notFound(); }
  const { token } = await params;
  const link = await getCheckout(token);
  if (!link) notFound();
  const history = await db.select().from(payments).where(eq(payments.checkoutId, link.id)).orderBy(desc(payments.createdAt));
  const attempts = await db.select().from(checkoutAttempts).where(eq(checkoutAttempts.checkoutId, link.id));
  const payment = history.find(payment => payment.status === 'paid') ?? history.find(payment => !['expired', 'cancelled'].includes(payment.status)) ?? history[0];
  const now = new Date().getTime();
  const generating = attempts.some(a => a.state === 'creating' && now - a.createdAt.getTime() < 15000);
  const latestAttempt = attempts.reduce<(typeof attempts)[number] | undefined>((latest, attempt) => !latest || attempt.createdAt > latest.createdAt ? attempt : latest, undefined);
  const failed = !generating && !!latestAttempt
    && (!payment || latestAttempt.createdAt > payment.createdAt)
    && (latestAttempt.state === 'unknown' || (latestAttempt.state === 'creating' && now - latestAttempt.createdAt.getTime() >= 15000));
  const retry = !generating && (!payment || ['expired', 'cancelled'].includes(payment.status));
  const qr = payment?.status === 'pending' && payment.qrCode ? await QRCode.toDataURL(payment.qrCode, { width: 256, margin: 2 }) : null;
  const labels = { pending: 'Aguardando pagamento', paid: 'Pagamento confirmado', expired: 'Pix expirado', cancelled: 'Pix cancelado', refunded: 'Pagamento reembolsado' };

  return <main id="conteudo" className="checkout-shell">
    <section className="checkout-card panel stack">
      <div className="checkout-brand-shape"><Brand className="checkout-brand" /></div>
      <header><h1>{link.campaignName}</h1><p>{link.description}</p></header>
      <div className="checkout-total"><span className="muted">Valor total</span><strong>{(link.amountCents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong></div>
      {generating && <div className="notice" role="status"><h2>Gerando seu Pix</h2><p>Aguarde alguns instantes e atualize a situação.</p></div>}
      {failed && retry && <div className="notice" role="status"><h2>Não foi possível gerar o Pix</h2></div>}
      {payment && !(retry && failed) && !generating && <section className="stack" aria-labelledby="payment-status">
        <div className="checkout-payment-heading"><h2 id="payment-status">{labels[payment.status]}</h2>{payment.status === 'pending' && payment.expiresAt && <PixCountdown key={payment.id} expiresAt={payment.expiresAt.toISOString()} />}</div>
        {payment.status === 'pending' && <>
          {qr && <img className="checkout-qr" src={qr} alt="QR Code para pagamento via Pix" width={256} height={256} />}
          <label className="checkout-code">Pix Copia e Cola<textarea rows={2} readOnly value={payment.qrCode ?? 'Código indisponível. Fale com o responsável pela campanha.'} /></label>
          {payment.qrCode && <CopyCode code={payment.qrCode} />}

        </>}
        {payment.status === 'paid' && <p>A liberação da campanha será acompanhada pelo responsável.</p>}
        {payment.status === 'refunded' && <p>Para detalhes, fale com o responsável pela campanha.</p>}
        {['expired', 'cancelled'].includes(payment.status) && <p>Gere um novo Pix abaixo.</p>}
      </section>}
      {retry && <CheckoutForm token={token} retry={failed} />}
      {(payment || generating) && <a className="button secondary" href={`/checkout/${token}`}>Atualizar situação</a>}
      <footer className="stack checkout-footer"><details><summary>Sobre o pagamento</summary><p>A operação envolve conversão/compra de stablecoins. O recebedor recebe DePix na rede Liquid, não reais em conta bancária.</p></details></footer>
    </section>
  </main>;
}
