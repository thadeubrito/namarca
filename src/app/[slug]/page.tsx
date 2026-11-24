import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { PublicCampaignEditor } from '@/editor/PublicCampaignEditor'
import { resolveSlug } from '@/lib/campaigns/campaigns'

export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default async function CampaignPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  if (resolveSlug(`/${slug}`) !== slug) notFound()

  // Availability is authoritative at the manifest handler, not a second DB read here.
  return <PublicCampaignEditor slug={slug} />
}
