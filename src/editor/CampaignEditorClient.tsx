'use client'

import dynamic from 'next/dynamic'
import type { ComponentProps } from 'react'
import type { PhotoEditor } from './PhotoEditor'

const ClientPhotoEditor = dynamic(
  () => import('./PhotoEditor').then(module => module.PhotoEditor),
  {
    ssr: false,
    loading: () => <span className="sr-only" role="status">Preparando editor…</span>,
  },
)

/** Canvas stays client-only; callers provide the campaign-editor-scope shell. */
export function CampaignEditorClient(props: ComponentProps<typeof PhotoEditor>) {
  return <ClientPhotoEditor {...props} />
}
