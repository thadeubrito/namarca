import Link from 'next/link';
import { notFound } from 'next/navigation';
import { desc, eq } from 'drizzle-orm';
import QRCode from 'qrcode';
import { db } from '@/db';
import { payments, checkoutAttempts } from '@/db/schema';
import { getCheckout, requireMockCheckout } from '@/lib/checkout';
import { CheckoutForm } from './form';
import { CopyCode } from './copy-code';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Pagamento', robots: { index: false, follow: false }, referrer: 'no-referrer' as const };

export default async function CheckoutPage({ params }: { params: Promise<{ token: string }> }) {
  try { requireMockCheckout(); } catch { notFound(); }
  const { token } = await params;
  const link = await getCheckout(token);
  if (!link) notFound();
  const history = await db.select().from(payments).where(eq(payments.checkoutId, link.id)).orderBy(desc(payments.createdAt));
  const attempts = await db.select().from(checkoutAttempts).where(eq(checkoutAttempts.checkoutId, link.id));
  const payment = history[0];
  const uncertain = attempts.some(a => a.state !== 'registered');
  const retry = !uncertain && (!payment || ['expired', 'cancelled'].includes(payment.status));
  const qr = payment?.status === 'pending' && payment.qrCode ? await QRCode.toDataURL(payment.qrCode, { width: 256, margin: 2 }) : null;
  const labels = { pending: 'Aguardando pagamento', paid: 'Pagamento confirmado', expired: 'Pix expirado', cancelled: 'Pix cancelado', refunded: 'Pagamento reembolsado' };

  return <main id="conteudo" className="checkout-shell">
    <section className="checkout-card panel stack">
      <header><Link className="wordmark" href="/">namarca</Link><p className="eyebrow">Pagamento da campanha</p><h1>{link.campaignName}</h1></header>
      <div className="checkout-total"><span className="muted">Valor total</span><strong>{(link.amountCents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong><span>Pagamento via Pix · PixGo</span></div>
      <p>Ativação digital para antes, durante e depois do evento.</p>
      {uncertain && <div className="notice" role="status"><h2>Estamos verificando seu Pix</h2><p>A criação do pagamento ainda não foi confirmada. Não gere outro Pix. Entre em contato com o responsável pela campanha para consultar a cobrança.</p></div>}
      {payment && <section className="stack" aria-labelledby="payment-status">
        <h2 id="payment-status">{labels[payment.status]}</h2>
        {payment.status === 'pending' && <>
          <p>Abra o aplicativo do seu banco e leia o QR Code ou use o Pix Copia e Cola. Confira os dados antes de confirmar.</p>
          {qr && <img className="checkout-qr" src={qr} alt="QR Code para pagamento via Pix" width={256} height={256} />}
          <label>Pix Copia e Cola<textarea readOnly value={payment.qrCode ?? 'Código indisponível. Entre em contato com o responsável pela campanha.'} /></label>
          {payment.qrCode && <CopyCode code={payment.qrCode} />}
          <p className="muted">{payment.expiresAt ? `Válido até ${payment.expiresAt.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })} (horário de São Paulo).` : 'Prazo de validade não informado pelo provedor.'}</p>
          <p>Já pagou? Atualize a situação para verificar a confirmação. Se o código venceu, peça ao responsável para consultar a cobrança antes de tentar novamente.</p>
        </>}
        {payment.status === 'paid' && <div className="notice"><p>Recebemos a confirmação do seu pagamento. Você pode guardar este link para consultar a situação da cobrança.</p><p>A liberação da campanha será acompanhada pelo responsável. Não é necessário pagar novamente.</p></div>}
        {payment.status === 'refunded' && <p>O provedor informou o reembolso deste pagamento. Para mais informações, fale com o responsável pela campanha.</p>}
        {['expired', 'cancelled'].includes(payment.status) && <p>Este código não está mais disponível para pagamento. Você pode gerar um novo Pix abaixo.</p>}
      </section>}
      {retry && <CheckoutForm token={token} />}
      {(payment || uncertain) && <a className="button secondary" href={`/checkout/${token}`}>Atualizar situação</a>}
      <footer className="stack checkout-footer"><p>Pagamento processado pela PixGo. A operação envolve conversão/compra de stablecoins, com recebimento em DePix na rede Liquid pelo recebedor, não em reais em conta bancária.</p><p>Este link é privado e permite consultar a cobrança sem conta ou senha. Compartilhe apenas com quem fará o pagamento.</p></footer>
    </section>
  </main>;
}
