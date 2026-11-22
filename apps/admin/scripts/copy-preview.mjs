import { cp, mkdir, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

// The Next deployment needs a local copy; the public host consumes campaign/dist independently.
const source = fileURLToPath(new URL('../../campaign/dist/', import.meta.url));
const target = fileURLToPath(new URL('../public/event-runtime/', import.meta.url));
await mkdir(fileURLToPath(new URL('../public/', import.meta.url)), { recursive: true });
await rm(target, { recursive: true, force: true });
await cp(source, target, { recursive: true });
