import { z } from 'zod';

export const clientInput = z.object({
  name: z.string().trim().min(2, 'Informe o nome do cliente com ao menos 2 caracteres.').max(160, 'O nome deve ter até 160 caracteres.'),
  contact: z.string().trim().max(254, 'O contato deve ter até 254 caracteres.'),
});

// Search is literal: % and _ supplied by the user are not SQL wildcards.
export function clientSearchPattern(query: string) {
  return `%${query.replace(/[\\%_]/g, '\\$&')}%`;
}
