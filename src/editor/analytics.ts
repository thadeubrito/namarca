import type { Composition } from './composition'

// A prévia administrativa nunca envia telemetria nem fotos.
export function trackEditingStarted(slug: string): void { void slug; }
export function trackPNGGenerated(slug: string, composition: Composition): void { void slug; void composition; }
