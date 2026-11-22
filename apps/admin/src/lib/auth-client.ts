"use client";

import { createAuthClient } from "better-auth/react";
import { twoFactorClient } from "better-auth/client/plugins";

// Same-origin only; no public environment variables or cross-site cookie credentials.
export const authClient = createAuthClient({ plugins: [twoFactorClient()] });
