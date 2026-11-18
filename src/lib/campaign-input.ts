import { z } from 'zod';
export const campaignInput = z.object({
  clientId: z.union([z.uuid(), z.literal(''), z.literal('new')]).optional().default(''),
  clientName: z.string().trim().max(160, 'O nome do cliente deve ter até 160 caracteres.').optional().default(''),
  clientContact: z.string().trim().max(254, 'O contato deve ter até 254 caracteres.').optional().default(''),
  notes: z.string().trim().max(3000, 'As observações devem ter até 3000 caracteres.').optional().default(''),
  name: z.string().trim().min(2, 'Informe o nome do evento.').max(160),
  slug: z.string().min(2).max(80).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use letras minúsculas, números e hífens no endereço.'),
  endsAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Informe uma data válida.').refine(value => {
    const date = new Date(`${value}T23:59:59-03:00`);
    return Number.isFinite(date.getTime()) && date.toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' }) === value && date.getTime() > Date.now();
  }, 'O encerramento deve ser uma data válida no futuro.'),
  price: z.string().trim().refine(value => value === '' || /^\d{1,6}(?:[,.]\d{1,2})?$/.test(value), 'Informe um valor como 395,00.').transform(value => value === '' ? null : Math.round(Number(value.replace(',', '.')) * 100)).refine(value => value === null || value >= 1000, 'A PixGo exige no mínimo R$ 10,00.'),
}).refine(value => value.clientId !== 'new' || value.clientName.length >= 2, { message: 'Informe o nome do novo cliente.', path: ['clientName'] });
