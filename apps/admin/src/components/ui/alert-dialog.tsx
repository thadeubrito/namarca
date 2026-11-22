'use client';

import { AlertDialog as Primitive } from 'radix-ui';
import type { ComponentProps } from 'react';
import { useDarkTheme } from '@/components/theme-scope';

export const AlertDialog = Primitive.Root;
export const AlertDialogTitle = Primitive.Title;
export const AlertDialogDescription = Primitive.Description;
export const AlertDialogCancel = Primitive.Cancel;
export const AlertDialogAction = Primitive.Action;

// Local shadcn-style composition over Radix, using the application's shared
// dialog tokens/backdrop rather than introducing a separate visual palette.
export function AlertDialogContent({ className = '', ...props }: ComponentProps<typeof Primitive.Content>) {
  const dark = useDarkTheme();
  return <Primitive.Portal>
    <Primitive.Overlay className="ws-client-dialog-overlay" />
    <Primitive.Content className={`ui-scope ws-recovery-dialog ${dark ? 'dark' : ''} ${className}`} {...props} />
  </Primitive.Portal>;
}
