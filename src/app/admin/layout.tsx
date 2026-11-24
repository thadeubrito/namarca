import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: { default: 'Namarca · Administrativo', template: '%s · Namarca' },
  robots: { index: false, follow: false },
};
export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return <><script src="/admin-theme.js" async blocking="render" /><a className="skip" href="#conteudo">Pular para o conteúdo</a>{children}</>;
}
