import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'Namarca · Administrativo', template: '%s · Namarca' },
  description: 'Operação de ativações digitais para eventos.',
  robots: { index: false, follow: false },
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body><a className="skip" href="#conteudo">Pular para o conteúdo</a>{children}</body></html>;
}
