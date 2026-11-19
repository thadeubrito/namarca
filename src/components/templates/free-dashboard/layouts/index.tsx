import type { ReactNode } from 'react';
import { Footer } from './footer';
import { Topbar } from './topbar';

/** Administrative shell: horizontal navigation, no sidebar or demo widgets. */
export function AdminLayout({ children }: { children: ReactNode }) {
  return <>
    <Topbar />
    <main id="conteudo" className="admin-content mx-auto flex w-full min-w-0 max-w-[1280px] flex-1 flex-col gap-6 px-4 py-6 sm:px-6 lg:py-8">{children}</main>
    <div className="mx-auto w-full max-w-[1280px] px-4 sm:px-6"><Footer /></div>
  </>;
}
